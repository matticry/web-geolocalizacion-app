import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { GeocercaDrawing, GeocercaDrawingState } from '@/core/models/Draw/DrawingCoordinate';

@Injectable({
    providedIn: 'root'
})
export class GeocercaDrawingService {
    private map: L.Map | null = null;
    private dibujoLayer: L.FeatureGroup | null = null;
    private isInitialized = false;


    // Estado del dibujo actual
    private estadoDibujo: GeocercaDrawingState = {
        creando: false,
        tipo: null,
        coordenadas: [],
        centro: null
    };

    // Arrays para manejo de elementos temporales
    private marcadoresPuntos: L.Marker[] = [];
    private lineasTemporales: L.Polyline[] = [];
    private formaActual: L.Layer | null = null;

    // Configuración para círculos
    private radioGeocerca = 500; // metros por defecto

    // Estados reactivos
    private drawing$ = new BehaviorSubject<GeocercaDrawingState>(this.estadoDibujo);
    private geocercaDrawing$ = new BehaviorSubject<GeocercaDrawing[]>([]);

    // Colección de geocercas creadas
    private geocercasCreadas: Map<string, GeocercaDrawing> = new Map();

    constructor(private msgService: MessageService) {}

    // Observables públicos
    get drawingState$(): Observable<GeocercaDrawingState> {
        return this.drawing$.asObservable();
    }

    get geocercas$(): Observable<GeocercaDrawing[]> {
        return this.geocercaDrawing$.asObservable();
    }

    /**
     * Inicializar servicio con el mapa
     */
    initialize(map: L.Map): void {

        if (this.isInitialized) {
            this.cleanup();
        }

        this.map = map;
        this.isInitialized = true;

        this.dibujoLayer = L.featureGroup().addTo(this.map);

        if (this.estadoDibujo.creando) {
            this.restaurarEstadoDibujo();
        }
    }

    /**
     * Restaurar estado de dibujo después de re-inicialización
     */
    private restaurarEstadoDibujo(): void {
        if (!this.estadoDibujo.creando || !this.estadoDibujo.tipo) return;
        this.configurarEventosMapa(this.estadoDibujo.tipo);

        if (this.estadoDibujo.coordenadas.length > 0) {
            this.dibujarGeocercaExistente();
        }

        this.drawing$.next(this.estadoDibujo);
    }


    /**
     * Iniciar creación de geocerca
     */
    iniciarCreacionGeocerca(tipo: 'circular' | 'poligono'): void {
        if (!this.map) {
            this.msgService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Mapa no inicializado'
            });
            return;
        }

        // Limpiar estado anterior
        this.cancelarCreacion();

        this.estadoDibujo = {
            creando: true,
            tipo,
            coordenadas: [],
            centro: null
        };
        this.configurarEventosMapa(tipo);

        this.drawing$.next(this.estadoDibujo);

        this.msgService.add({
            severity: 'info',
            summary: 'Modo dibujo activado',
            detail: `Haga clic en el mapa para crear una geocerca ${tipo}`
        });
    }


    /**
     * Configurar eventos del mapa
     */
    private configurarEventosMapa(tipo: 'circular' | 'poligono'): void {
        if (!this.map) return;

        this.map.off('click');

        setTimeout(() => {
            if (!this.map) return;

            if (tipo === 'circular') {
                this.map.on('click', this.onMapClickCircular.bind(this));
            } else {
                this.map.on('click', this.onMapClickPoligono.bind(this));
            }

        }, 100);
    }

    /**
     * Handle click para círculo
     */
    private onMapClickCircular(e: L.LeafletMouseEvent): void {
        if (!this.estadoDibujo.creando) return;

        const { lat, lng } = e.latlng;
        this.estadoDibujo.centro = { lat, lng };

        // Limpiar forma anterior
        if (this.formaActual && this.dibujoLayer) {
            this.dibujoLayer.removeLayer(this.formaActual);
        }

        // Crear círculo visual
        this.formaActual = L.circle([lat, lng], {
            radius: this.radioGeocerca,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2
        });

        this.dibujoLayer!.addLayer(this.formaActual);

        // Generar coordenadas
        this.generarCoordenadasCirculo(lat, lng, this.radioGeocerca);

        this.estadoDibujo.coordenadas = [...this.estadoDibujo.coordenadas];
        this.drawing$.next(this.estadoDibujo);

        this.msgService.add({
            severity: 'success',
            summary: 'Geocerca circular creada',
            detail: 'Ajuste el radio si es necesario y proceda a guardar'
        });
    }

    /**
     * Handle click para polígono
     */
    private onMapClickPoligono(e: L.LeafletMouseEvent): void {
        if (!this.estadoDibujo.creando) return;

        const { lat, lng } = e.latlng;
        this.estadoDibujo.coordenadas.push({ lat, lng });

        this.agregarMarcadorPunto(lat, lng, this.estadoDibujo.coordenadas.length);
        this.actualizarPoligono();

        this.drawing$.next(this.estadoDibujo);

        this.msgService.add({
            severity: 'info',
            summary: `Punto ${this.estadoDibujo.coordenadas.length} agregado`,
            detail: this.estadoDibujo.coordenadas.length >= 3 ?
                'Ya puede continuar o agregar más puntos' :
                `Necesita ${3 - this.estadoDibujo.coordenadas.length} puntos más`
        });
    }

    /**
     * Agregar marcador de punto
     */
    private agregarMarcadorPunto(lat: number, lng: number, numero: number): void {
        if (!this.dibujoLayer) return;

        const iconoNumero = L.divIcon({
            className: 'numero-punto-custom',
            iconSize: [30, 30],
            html: `<div style="
            background-color: #8b5cf6;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            font-weight: bold;
            font-size: 14px;
            box-sizing: border-box;
            cursor: move;
          ">${numero}</div>`,
            iconAnchor: [15, 15]
        });

        const marcador = L.marker([lat, lng], {
            icon: iconoNumero,
            draggable: true
        });

        marcador.addTo(this.dibujoLayer);
        this.marcadoresPuntos.push(marcador);

        marcador.bindTooltip(`Punto ${numero}<br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`, {
            permanent: false,
            direction: 'top'
        });

        marcador.on('dragstart', () => {
            marcador.closeTooltip();
            const iconElement = (marcador as any)._icon;
            if (iconElement) {
                iconElement.classList.add('dragging');
            }
        });

        marcador.on('drag', (event) => {
            const newPos = event.target.getLatLng();
            marcador.setTooltipContent(`Punto ${numero}<br>Lat: ${newPos.lat.toFixed(6)}<br>Lng: ${newPos.lng.toFixed(6)}`);
        });

        marcador.on('dragend', (event) => {
            const newPos = event.target.getLatLng();

            const iconElement = (marcador as any)._icon;
            if (iconElement) {
                iconElement.classList.remove('dragging');
            }

            const index = this.marcadoresPuntos.findIndex(marker => marker === marcador);

            if (index !== -1) {
                this.estadoDibujo.coordenadas[index] = {
                    lat: newPos.lat,
                    lng: newPos.lng
                };

                this.actualizarPoligono();
                this.drawing$.next(this.estadoDibujo);

                marcador.setTooltipContent(`Punto ${numero}<br>Lat: ${newPos.lat.toFixed(6)}<br>Lng: ${newPos.lng.toFixed(6)}`);

                this.msgService.add({
                    severity: 'success',
                    summary: `Punto ${numero} movido`,
                    detail: `Nueva posición: ${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`
                });
            }
        });
    }

    /**
     * Crear líneas punteadas
     */
    private crearLineasPunteadas(): void {
        if (this.estadoDibujo.coordenadas.length < 2) return;

        for (let i = 0; i < this.estadoDibujo.coordenadas.length; i++) {
            const punto1 = this.estadoDibujo.coordenadas[i];
            const punto2 = this.estadoDibujo.coordenadas[(i + 1) % this.estadoDibujo.coordenadas.length];

            if (this.estadoDibujo.coordenadas.length >= 3 || i < this.estadoDibujo.coordenadas.length - 1) {
                const linea = L.polyline(
                    [
                        [punto1.lat, punto1.lng],
                        [punto2.lat, punto2.lng]
                    ],
                    {
                        color: '#8b5cf6',
                        weight: 2,
                        opacity: 0.8,
                        dashArray: '8, 6'
                    }
                );

                this.lineasTemporales.push(linea);
                this.dibujoLayer!.addLayer(linea);
            }
        }
    }

    /**
     * Actualizar polígono
     */
    private actualizarPoligono(): void {
        if (this.estadoDibujo.coordenadas.length < 2) return;

        // Limpiar forma anterior
        if (this.formaActual && this.dibujoLayer) {
            this.dibujoLayer.removeLayer(this.formaActual);
        }

        this.lineasTemporales.forEach((linea) => {
            if (this.dibujoLayer) {
                this.dibujoLayer.removeLayer(linea);
            }
        });
        this.lineasTemporales = [];
        this.crearLineasPunteadas();
        if (this.estadoDibujo.coordenadas.length >= 3) {
            const latLngs = this.estadoDibujo.coordenadas.map((coord) => [coord.lat, coord.lng] as L.LatLngTuple);

            const polygon = L.polygon(latLngs, {
                stroke: false,
                fillColor: '#8b5cf6',
                fillOpacity: 0.15
            });

            this.formaActual = polygon;
            this.dibujoLayer!.addLayer(polygon);
        }
        this.calcularCentroPoligono();
    }

    /**
     * Calcular centro del polígono
     */
    private calcularCentroPoligono(): void {
        if (this.estadoDibujo.coordenadas.length === 0) return;

        const sumLat = this.estadoDibujo.coordenadas.reduce((sum, coord) => sum + coord.lat, 0);
        const sumLng = this.estadoDibujo.coordenadas.reduce((sum, coord) => sum + coord.lng, 0);

        this.estadoDibujo.centro = {
            lat: sumLat / this.estadoDibujo.coordenadas.length,
            lng: sumLng / this.estadoDibujo.coordenadas.length
        };
    }

    /**
     * Generar coordenadas de círculo
     */
    private generarCoordenadasCirculo(lat: number, lng: number, radio: number): void {
        this.estadoDibujo.coordenadas = [];
        const puntos = 32;

        for (let i = 0; i < puntos; i++) {
            const angulo = (i * 2 * Math.PI) / puntos;

            const deltaLat = (radio / 111320) * Math.cos(angulo);
            const deltaLng = (radio / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angulo);

            this.estadoDibujo.coordenadas.push({
                lat: lat + deltaLat,
                lng: lng + deltaLng
            });
        }
    }

    /**
     * Calcular área usando la fórmula de Shoelace
     */
    private calcularArea(): number {
        if (this.estadoDibujo.coordenadas.length < 3) return 0;

        let area = 0;
        const coords = this.estadoDibujo.coordenadas;

        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            area += coords[i].lng * coords[j].lat;
            area -= coords[j].lng * coords[i].lat;
        }

        return Math.abs(area / 2) * 111000 * 111000; // Aproximado en m²
    }

    /**
     * Finalizar y guardar geocerca
     */
    finalizarGeocerca(): GeocercaDrawing | null {
        if (!this.estadoDibujo.creando || !this.estadoDibujo.centro) {
            return null;
        }

        if (this.estadoDibujo.tipo === 'poligono' && this.estadoDibujo.coordenadas.length < 3) {
            return null;
        }

        const geocerca: GeocercaDrawing = {
            id: this.generarId(),
            tipo: this.estadoDibujo.tipo!,
            coordenadas: [...this.estadoDibujo.coordenadas],
            centro: { ...this.estadoDibujo.centro },
            area: this.calcularArea(),
            radio: this.estadoDibujo.tipo === 'circular' ? this.radioGeocerca : undefined,
            activa: true,
            fechaCreacion: new Date()
        };

        this.geocercasCreadas.set(geocerca.id, geocerca);
        this.geocercaDrawing$.next(Array.from(this.geocercasCreadas.values()))

        return geocerca;
    }


    /**
     * Cancelar creación actual
     */
    cancelarCreacion(): void {

        if (this.map) {
            this.map.off('click');
        }
        this.limpiarElementosTemporales();

        this.estadoDibujo = {
            creando: false,
            tipo: null,
            coordenadas: [],
            centro: null
        };

        this.drawing$.next(this.estadoDibujo);
    }

    /**
     * Limpiar solo los elementos del mapa (sin resetear estado completo)
     */
    private cleanup(): void {
        if (this.map) {
            this.map.off('click');
        }
        this.limpiarElementosTemporales();

        if (this.dibujoLayer && this.map) {
            this.map.removeLayer(this.dibujoLayer);
            this.dibujoLayer = null;
        }
    }

    cancelarEdicion(): void {
        if (this.map) {
            this.map.off('click');
        }
        this.limpiarElementosTemporales();
        this.estadoDibujo = {
            creando: false,
            tipo: null,
            coordenadas: [],
            centro: null
        };

        this.drawing$.next(this.estadoDibujo);
    }

    /**
     * Limpiar elementos temporales del dibujo
     */
    private limpiarElementosTemporales(): void {
        this.marcadoresPuntos.forEach(marcador => {
            if (this.dibujoLayer) {
                this.dibujoLayer.removeLayer(marcador);
            }
        });
        this.marcadoresPuntos = [];

        this.lineasTemporales.forEach(linea => {
            if (this.dibujoLayer) {
                this.dibujoLayer.removeLayer(linea);
            }
        });
        this.lineasTemporales = [];

        if (this.formaActual && this.dibujoLayer) {
            this.dibujoLayer.removeLayer(this.formaActual);
            this.formaActual = null;
        }
    }

    /**
     * Método para limpiar al salir del componente (NO destruir completamente)
     */
    cleanupOnDestroy(): void {
        this.cleanup();
        this.map = null;
        this.isInitialized = false;
    }


    /**
     * Cambiar radio del círculo
     */
    cambiarRadioCirculo(nuevoRadio: number): void {
        if (this.estadoDibujo.tipo === 'circular' && this.estadoDibujo.centro) {
            this.radioGeocerca = nuevoRadio;
            this.generarCoordenadasCirculo(
                this.estadoDibujo.centro.lat,
                this.estadoDibujo.centro.lng,
                nuevoRadio
            );
            if (this.formaActual && this.dibujoLayer) {
                this.dibujoLayer.removeLayer(this.formaActual);

                this.formaActual = L.circle([this.estadoDibujo.centro.lat, this.estadoDibujo.centro.lng], {
                    radius: nuevoRadio,
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.2
                });

                this.dibujoLayer.addLayer(this.formaActual);
            }

            this.drawing$.next(this.estadoDibujo);
        }
    }

    /**
     * Generar ID único
     */
    private generarId(): string {
        return `geocerca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }


    /**
     * Cargar geocerca existente para edición
     */
    cargarGeocercaParaEdicion(
        tipo: 'circular' | 'poligono',
        coordenadas: Array<{lat: number, lng: number}>,
        centro: {lat: number, lng: number},
        radio?: number
    ): void {
        if (!this.map) return;

        this.cancelarCreacion();
        this.estadoDibujo = {
            creando: true,
            tipo: tipo,
            coordenadas: [...coordenadas],
            centro: { ...centro }
        };

        this.configurarEventosMapa(tipo);
        if (tipo === 'circular' && radio) {
            this.radioGeocerca = radio;
        }

        this.dibujarGeocercaExistente();

        this.drawing$.next(this.estadoDibujo);
    }

    private dibujarGeocercaExistente(): void
    {
        if (!this.map || !this.estadoDibujo.coordenadas.length) return;

        this.limpiarElementosTemporales();

        if (this.estadoDibujo.tipo === 'circular') {
            this.dibujarCirculoExistente();

        }else{
            this.dibujarPoligonoExistente();

        }
    }

    private dibujarCirculoExistente(): void
    {
        if (!this.estadoDibujo.centro || !this.dibujoLayer) return;

        this.formaActual = L.circle([this.estadoDibujo.centro.lat, this.estadoDibujo.centro.lng], {
            radius: this.radioGeocerca,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2
        });
        this.dibujoLayer.addLayer(this.formaActual);
    }

    private dibujarPoligonoExistente(): void
    {
        this.estadoDibujo.coordenadas.forEach((coord, index) => {
            this.agregarMarcadorPunto(coord.lat, coord.lng, index + 1);
        });
        this.actualizarPoligono();

    }

}
