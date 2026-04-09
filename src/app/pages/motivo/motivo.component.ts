import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToolbarModule } from 'primeng/toolbar';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { firstValueFrom } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { PaginatorModule } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { Tooltip } from 'primeng/tooltip';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { MapService, SearchResult } from '@/core/services/map.service';
import { GeocercaService } from '@/core/services/geocerca.service';
import { AuthService } from '@/core/services/auth.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { GeocercaValidationResponse, GeofenceDto } from '@/core/models/Geocercas/GeocercaValidationResponseDto';
import { Select } from 'primeng/select';
import { Slider } from 'primeng/slider';
import { ProvinceService } from '@/core/services/province.service';
import { GeocercaDrawingService } from '@/core/services/geocerca-drawing.service';
import { GeocercaDrawing, GeocercaDrawingState } from '@/core/models/Draw/DrawingCoordinate';
import { Canton, Parroquia, Provincia } from '@/core/models/ProvinciaDto';
import { AutoComplete } from 'primeng/autocomplete';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AdditionalGeocercaData, GeocercaMapper } from '@/core/models/helpers/geocerca-mapper.helper';
import { ActualizarGeocercaDto, CoordenadaDto } from '@/core/models/Geocercas/GeocercaDto';
import { MotivoService } from '@/core/services/motivo.service';
import { MotivoResponse } from '@/core/models/Motivo/Motivo';

interface TipoGeocercaOption {
    label: string;
    value: 'circular' | 'poligono';
    icon: string;
}

@Component({
    selector: 'app-onlygeocercas',
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        InputTextModule,
        ButtonModule,
        RippleModule,
        ToolbarModule,
        TextareaModule,
        InputNumberModule,
        DialogModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        ReactiveFormsModule,
        ConfirmDialogModule,
        CardModule,
        PaginatorModule,
        SkeletonModule,
        Tooltip,
        Select,
        Slider,
        AutoComplete,
        ToggleSwitch
    ],
    templateUrl: './motivo.component.html',
    styleUrl: './motivo.component.css'
})
export class MotivosComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
    // =================== VARIABLES/PROPIEDADES ===================

    //======= VARIABLES PRIVADAS PARA MANEJO DE SUBSCRIPCIONES ===================//
    private destroy$ = new Subject<void>(); // Subject para manejo de subscripciones


    //======= Propiedades de provincias ===================//
    cantonesList: Canton[] = [];
    parroquiasList: Parroquia[] = [];

    // Propiedades para las sugerencias filtradas
    provinciasFiltradas: Provincia[] = [];
    ciudadesFiltradas: Canton[] = [];
    sectoresFiltrados: Parroquia[] = [];
    MotivoNuevoForm!: FormGroup;
    MotivoEditarForm!: FormGroup;

    // Propiedades para elementos seleccionados
    provinciaSeleccionada: Provincia | null = null;
    ciudadSeleccionada: Canton | null = null;
    sectorSeleccionado: Parroquia | null = null;

    //======= VARIABLES PARA VALIDACIÓN DEL CÓDIGO DE LAS GEOCERCAS ===================//
    // Estados de validación de código
    private codeValidationSubject = new Subject<string>(); // Subject para manejar la validación del código
    validatingCode: boolean = false;
    codeValidationResult: 'valid' | 'invalid' | 'pending' | null = null;
    codeValidationMessage: string = '';


    // =================== PROPIEDADES PARA ELIMINACIÓN MÚLTIPLE ===================
    modoEliminacion: boolean = false; // borrar
    modoFormulario: boolean = false;
    geocercasSeleccionadas: Set<string> = new Set(); // Set con códigos de geocercas seleccionadas
    todasSeleccionadas: boolean = false;

    // ===================  PROPIEDADES PARA EDICION DE GEOCERCAS ===================

    editandoGeocerca: boolean = false;
    modoEdicion: boolean = false;
    geocercaOriginal: GeofenceDto | null = null;



    // ===================  PROPIEDADES PARA CREACIÓN DE GEOCERCAS ===================
    creandoGeocerca: boolean = false;
    geocercaDialog: boolean = false;

    creandoMotivo: boolean = false;
    editandoMotivo: boolean = false;

    // Propiedades del dibujo (sincronizadas con el servicio)
    tipoGeocerca: 'circular' | 'poligono' = 'circular';
    radioGeocerca: number = 500;
    coordenadasGeocerca: Array<{ lat: number, lng: number }> = [];
    centroGeocerca: { lat: number, lng: number } | null = null;

    // Estados del servicio de drawing
    drawingState: GeocercaDrawingState | null = null;
    geocercasCreadas: GeocercaDrawing[] = [];

    // Configuraciones para UI
    tiposGeocerca: TipoGeocercaOption[] = [
        {
            label: 'Geocerca Circular',
            value: 'circular',
            icon: 'pi pi-circle'
        },
        {
            label: 'Geocerca Poligonal',
            value: 'poligono',
            icon: 'pi pi-stop'
        }
    ];

    //======= VARIABLES PARA EL MAPA ===================//
    // Mapa (delegadas al servicio)
    searchLocation: string = '';
    searchingLocation: boolean = false;
    searchResults: SearchResult[] = [];
    mapInitialized: boolean = false;


    //======= VARIABLES DE GEOCERCAS ===================//
    // Propiedades de geocercas
    geocercas: GeofenceDto[] = [];
    motivos: MotivoResponse[] = [];
    filteredGeocercas: GeofenceDto[] = [];
    filteredmotivos: MotivoResponse[] = [];


    paginatedGeocercas: GeofenceDto[] = [];
    paginatedmotivos: MotivoResponse[] = [];
    selectedGeocerca: GeofenceDto | null = null;
    loading: boolean = true;


    //======= VARIABLES DE PAGINACION DE GEOCERCAS ==================//
    first: number = 0;
    itemsPerPage: number = 4;
    enterpriseName: string = '';     // Propiedades de empresa



    constructor(
        private readonly geocercaService: GeocercaService, // borrar
        private readonly _MotivoService: MotivoService,
        private readonly fb: FormBuilder,
        private readonly authService: AuthService,
        private readonly msgService: MessageService,
        private readonly mapService: MapService,
        private readonly provinceService: ProvinceService,
        private readonly geocercaDrawing: GeocercaDrawingService,
        private readonly confirmationService: ConfirmationService
    ) { }


    //============== MÉTODOS DE INICIALIZACIÓN ===================

    async initializeMap(): Promise<void> {

        this.mapInitialized = true;
        const container = this.mapContainer.nativeElement;
        if (!container) {
            console.error('Contenedor del mapa no encontrado');
            return;
        }
        try {
            await this.mapService.initializeMap(this.mapContainer, {
                center: [-0.2298, -78.5249],
                zoom: 13,
                defaultLocation: 'Quito, Ecuador',
                zoomControl: false,
            });

            if (!this.loading && this.geocercas.length > 0) {
                this.mapService.addGeocercaMarkers(this.geocercas);
            }
        } catch (error) {
            console.error('Error al inicializar el mapa:', error);
        }
    }


    ngOnInit(): void {
        this.initializeEnterpriseName();
        //this.getAllGeocercas();
        this.getAllMotivos();
        //this.subscribeToMapService();
        //this.subscribeToDrawingService();
        this.initializeMotivoFormNuevo();
        this.initializeMotivoFormEditar();
        //this.inicializarProvincias();
        //this.setupCodeValidation();
    }

    ngAfterViewInit(): void {
        requestAnimationFrame(() => {
            this.initializeMap().then(() => { });
        });
    }

    private inicializarProvincias(): void {
        this.provinciasFiltradas = this.provinceService.getProvincias();
    }

    initializeMotivoFormNuevo(): void {
        this.MotivoNuevoForm = this.fb.group({
            motvcod: ['', [Validators.required, Validators.minLength(1)]],
            motvnom: ['', [Validators.required, Validators.minLength(3)]],
            motvact: [true]
        });
    }
    initializeMotivoFormEditar(): void {
        this.MotivoEditarForm = this.fb.group({
            motvcod: [''],
            motvnom: ['', [Validators.required, Validators.minLength(3)]],
            motvact: [true]
        });
    }

    /**
     * Inicializa el nombre de la empresa desde el auth service
     */
    private initializeEnterpriseName(): void {
        const empresa = this.authService.getEmpresa();
        if (empresa && empresa.nomempresa) {
            this.enterpriseName = empresa.nomempresa;
        } else {
            this.msgService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo obtener la información de la empresa'
            });
        }
    }

    //=================================================================//


    //======= METODOS PARA EL MANEJO DE SUBSCRIPCIONES ===================//

    /**
     * Suscribe a los observables del servicio de mapas
     */
    private subscribeToMapService(): void {
        this.mapService.isMapInitialized$.pipe(takeUntil(this.destroy$)).subscribe((initialized) => {
            this.mapInitialized = initialized;
            if (initialized && this.mapService['map']) {
                this.geocercaDrawing.initialize(this.mapService['map']);
            }
        });

        this.mapService.isSearchingLocation$.pipe(takeUntil(this.destroy$)).subscribe((searching) => {
            this.searchingLocation = searching;
        });

        this.mapService.searchResultsList$.pipe(takeUntil(this.destroy$)).subscribe((results) => {
            this.searchResults = results;
        });
    }

    /**
     * Suscribirse a los observables del servicio de drawing
     */
    private subscribeToDrawingService(): void {
        // Estado del dibujo
        this.geocercaDrawing.drawingState$
            .pipe(takeUntil(this.destroy$))
            .subscribe(state => {
                this.drawingState = state;

                if (state) {
                    // Sincronizar estado local
                    this.coordenadasGeocerca = [...state.coordenadas];
                    this.centroGeocerca = state.centro ? { ...state.centro } : null;
                    this.creandoGeocerca = state.creando;

                    if (state.tipo) {
                        this.tipoGeocerca = state.tipo;
                    }
                }
            });

        // Geocercas creadas
        this.geocercaDrawing.geocercas$
            .pipe(takeUntil(this.destroy$))
            .subscribe(geocercas => {
                this.geocercasCreadas = geocercas;
            });
    }
    //=================================================================//



    // ============== MÉTODOS PARA VALIDACION DE CODIGO DE GEOCERCA =============

    /**
     * Configurar validación de código con debounce
     */
    private setupCodeValidation(): void {
        this.codeValidationSubject
            .pipe(
                debounceTime(500), // Esperar 500ms después de que el usuario deje de escribir
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(code => {
                if (code && code.length >= 5) {
                    this.validateGeocercaCode(code);
                } else {
                    this.resetCodeValidation();
                }
            });
        // Suscribirse a cambios en el campo de código
        this.MotivoNuevoForm.get('motvcod')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => {
                if (value) {
                    this.codeValidationResult = 'pending';
                    this.codeValidationSubject.next(value);
                }
            });

    }

    /**
     * Validar código de geocerca con el backend
     */
    private validateGeocercaCode(code: string): void {
        this.validatingCode = true;
        this.codeValidationResult = 'pending';

        this.geocercaService.validarCodigoGeocerca(code)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    // Código válido y disponible
                    this.validatingCode = false;
                    this.codeValidationResult = 'valid';
                    this.codeValidationMessage = 'Código disponible';
                },
                error: (error: HttpErrorResponse) => {
                    // Cualquier error = código inválido

                    // Mensaje simplificado basado en el status
                    if (error.status === 400) {
                        this.codeValidationMessage = 'El código ya existe o no es válido';
                    } else {
                        this.codeValidationMessage = 'Error al validar el código. Intente nuevamente.';
                    }
                }
            });
    }


    /**
     * Resetear validación de código
     */
    private resetCodeValidation(): void {
        this.validatingCode = false;
        this.codeValidationResult = null;
        this.codeValidationMessage = '';
    }

    /**
     * Obtener clase CSS para input de código según estado de validación
     */
    getCodeInputClass(): string {
        const baseClass = 'w-full';

        if (this.codeValidationResult === 'valid') {
            return `${baseClass} border-green-300 focus:border-green-500 focus:ring-green-200`;
        } else if (this.codeValidationResult === 'invalid') {
            return `${baseClass} border-red-300 focus:border-red-500 focus:ring-red-200`;
        }

        return baseClass;
    }

    /**
     * Obtener clase CSS para mensaje de validación
     */
    getValidationMessageClass(): string {
        if (this.codeValidationResult === 'valid') {
            return 'text-xs text-green-600 flex items-center gap-1';
        } else if (this.codeValidationResult === 'invalid') {
            return 'text-xs text-red-600 flex items-center gap-1';
        }

        return 'text-xs text-surface-500';
    }

    //=================================================================//


    // ============== MÉTODOS PARA CARGAR DATOS DE PROVINCIAS =============

    filtrarProvincias(event: any): void {
        const query = event.query?.toLowerCase() || '';
        this.provinciasFiltradas = this.provinceService.filtrarProvincias(query);
    }

    filtrarCiudades(event: any): void {
        const query = event.query?.toLowerCase() || '';
        this.ciudadesFiltradas = this.provinceService.filtrarCantones(this.cantonesList, query);
    }

    filtrarSectores(event: any): void {
        const query = event.query?.toLowerCase() || '';
        this.sectoresFiltrados = this.provinceService.filtrarParroquias(this.parroquiasList, query);
    }

    // Métodos para manejar selecciones
    onProvinciaSeleccionada(event: any): void {
        const provinciaObj: Provincia = event.value;
        this.provinciaSeleccionada = provinciaObj;

        // Usar el servicio para obtener cantones
        this.cantonesList = this.provinceService.getCantones(provinciaObj.codigo);

        // Limpiar selecciones dependientes
        this.ciudadSeleccionada = null;
        this.parroquiasList = [];
        this.sectorSeleccionado = null;

        // Actualizar formulario
        this.MotivoNuevoForm.patchValue({
            geocciud: '',
            geocsec: ''
        });
    }

    onProvinciaLimpiada() {
        this.provinciaSeleccionada = null;
        this.cantonesList = [];
        this.ciudadSeleccionada = null;
        this.parroquiasList = [];
        this.sectorSeleccionado = null;
    }

    onCiudadSeleccionada(event: any): void {
        const ciudadObj: Canton = event.value;
        this.ciudadSeleccionada = ciudadObj;

        if (this.provinciaSeleccionada) {
            this.parroquiasList = this.provinceService.getParroquias(this.provinciaSeleccionada.codigo, ciudadObj.codigo);
        }

        this.sectorSeleccionado = null;
        this.MotivoNuevoForm.patchValue({
            geocsec: ''
        });
    }

    onCiudadLimpiada() {
        this.ciudadSeleccionada = null;
        this.parroquiasList = [];
        this.sectorSeleccionado = null;
    }

    // ==============================================================================


    /**
     * Iniciar edición de geocerca existente
     */
    editarGeocerca(geocerca: GeofenceDto): void {


        if (!this.mapInitialized) {
            this.msgService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Espere a que el mapa se inicialice completamente'
            });
            return;
        }

        // Guardar copia original para comparar cambios
        this.geocercaOriginal = { ...geocerca };
        this.modoEdicion = true;
        this.editandoGeocerca = true;
        this.selectedGeocerca = geocerca;

        // Cargar datos existentes en el formulario
        //this.cargarGeocercaParaEdicion(geocerca);

        // Iniciar drawing service en modo edición
        this.iniciarEdicionEnMapa(geocerca);
        this.geocercaDialog = true;

        this.msgService.add({
            severity: 'info',
            summary: 'Modo edición activado',
            detail: `Editando geocerca: ${geocerca.geocnom}`
        });
    }
    /**
     * Cargar datos de geocerca existente en el formulario
     */
    /*private cargarGeocercaParaEdicion(geocerca: GeofenceDto): void {
        // Extraer coordenadas
        let coordenadas: CoordenadaDto[] = [];
        try {
            coordenadas = JSON.parse(geocerca.geoccoor);
        } catch (error) {
            console.error('Error parseando coordenadas:', error);
        }

        // Determinar tipo de geocerca y configurar estado
        this.tipoGeocerca = this.determinarTipoGeocerca(coordenadas);
        this.coordenadasGeocerca = coordenadas;
        this.centroGeocerca = { lat: geocerca.geoclat, lng: geocerca.geoclon };

        // Si es circular, calcular radio aproximado
        if (this.tipoGeocerca === 'circular' && coordenadas.length > 0) {
            this.radioGeocerca = this.calcularRadioDesdeArea(geocerca.geocarm);
        }

        // Cargar datos en el formulario
        this.MotivoNuevoForm.patchValue({
            motvcod: geocerca.motvcod,
            geocnom: geocerca.geocnom,
            geocprov: geocerca.geocprov,
            geocciud: geocerca.geocciud,
            geocsec: geocerca.geocsec,
            geocdirre: geocerca.geocdirre,
            geocpais: geocerca.geocpais,
            geocpri: geocerca.geocpri,
            motvact: geocerca.motvact,
            motvnom: geocerca.motvnom
        });

        // Deshabilitar código en modo edición
        this.MotivoNuevoForm.get('motvcod')?.disable();
        this.codeValidationResult = 'valid'; // El código existente siempre es válido
    }*/

    /**
     * Determinar tipo de geocerca basado en coordenadas
     */
    private determinarTipoGeocerca(coordenadas: CoordenadaDto[]): 'circular' | 'poligono' {
        if (coordenadas.length === 32) {
            const esCircular = this.verificarSiEsCircular(coordenadas);
            return esCircular ? 'circular' : 'poligono';
        }
        return 'poligono';
    }

    /**
     * Verificar si las coordenadas forman un círculo
     */
    private verificarSiEsCircular(coordenadas: CoordenadaDto[]): boolean {
        if (coordenadas.length !== 32) return false;

        const centro = this.centroGeocerca;
        if (!centro) return false;

        const distancias = coordenadas.map(coord =>
            Math.sqrt(Math.pow(coord.lat - centro.lat, 2) + Math.pow(coord.lng - centro.lng, 2))
        );

        const distanciaPromedio = distancias.reduce((sum, d) => sum + d, 0) / distancias.length;
        const tolerancia = distanciaPromedio * 0.05;

        return distancias.every(d => Math.abs(d - distanciaPromedio) < tolerancia);
    }

    /**
     * Calcular radio aproximado desde el área
     */
    private calcularRadioDesdeArea(area: number): number {
        const radio = Math.sqrt(area / Math.PI);
        return Math.max(50, Math.min(2000, Math.round(radio)));
    }

    /**
     * Abrir diálogo de edición
     */
    DialogNuevo = false;
    crearNuevoMotivo(): void {
        if (this.motivos.length > 0) {
            let ordenado = [...this.motivos].sort((a, b) =>
                b.motvcod.localeCompare(a.motvcod)
            );
            this.ultimocodigo = ordenado[0]?.motvcod || '';
        }
        if (this.ultimocodigo == "") {
            this.ultimocodigo = "";
        } else {
            if (!/^\d+$/.test(this.ultimocodigo)) {
                this.ultimocodigo = '';
            } else {
                const numero = parseInt(this.ultimocodigo, 10) + 1;
                this.ultimocodigo = numero.toString().padStart(this.ultimocodigo.length, '0');
            }
        }
        this.MotivoNuevoForm.get('motvcod')?.setValue(this.ultimocodigo);
        this.DialogNuevo = true;
        if (this.ultimocodigo !== "") {
            this.validarCodigoNuevoMotivo();
        }
    }
    DialogEliminar = false;
    MotivoTemporal: MotivoResponse | null = null;
    crearEliminarMotivo(motivo: MotivoResponse): void {
        this.MotivoTemporal = motivo;
        if (this.MotivoTemporal !== null) {
            this.DialogEliminar = true;
        }
    }
    cerrarDialogoEliminar() {
        this.DialogEliminar = false;
    }
    EliminarMotivo() {
        if (this.MotivoTemporal?.motvcod) {
            this._MotivoService.GETEliminar(this.MotivoTemporal?.motvcod).subscribe({
                next: () => {
                    this.msgService.add({
                        severity: 'success',
                        summary: 'Exito',
                        detail: `Registro eliminado`
                    });
                    this.cerrarDialogoEliminar();
                    this.getAllMotivos();
                },
                error: (err) => {
                    if (err.status === 404) {
                        this.msgService.add({
                            severity: 'warn',
                            summary: 'Conflicto',
                            detail: 'Motivo no Existe'
                        });
                    } else {
                        this.msgService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Error interno no fue posible elimnar registro'
                        });
                    }
                }
            });
        }
    }
    DialogEditar = false;
    cerrarDialogoEditar() {
        this.DialogEditar = false;
    }
    crearEditarMotivo(motivo: MotivoResponse): void {
        //
        this.MotivoTemporal = motivo;
        if (this.MotivoTemporal !== null) {
            this.MotivoEditarForm.get('motvcod')?.setValue(this.MotivoTemporal.motvcod);
            this.MotivoEditarForm.get('motvnom')?.setValue(this.MotivoTemporal.motvnom);
            this.MotivoEditarForm.get('motvact')?.setValue(this.MotivoTemporal.motvact);
            this.MotivoEditarForm.get('motvcod')?.disable();
            this.DialogEditar = true;
        }
    }
    guardarEditarMotivo() {
        if (this.MotivoEditarForm.invalid) {
            this.MotivoEditarForm.markAllAsTouched();
            this.msgService.add({
                severity: 'error',
                summary: 'Error de validación',
                detail: 'Complete todos los campos requeridos'
            });
            return;
        }
        let cuerpoMotivo: MotivoResponse = {
            motvcod: this.MotivoEditarForm.get('motvcod')?.value,
            motvnom: this.MotivoEditarForm.get('motvnom')?.value,
            motvact: this.MotivoEditarForm.get('motvact')?.value
        };
        this._MotivoService.POSTEditar(cuerpoMotivo).subscribe({
            next: () => {
                this.msgService.add({
                    severity: 'success',
                    summary: 'Exito',
                    detail: `Registro Editado`
                });
                this.cerrarDialogoEditar();
                this.getAllMotivos();
            },
            error: (err) => {
                if (err.status === 404) {
                    this.msgService.add({
                        severity: 'warn',
                        summary: 'No existe',
                        detail: 'Registro no existe, no fue posible editar'
                    });
                } else {
                    this.msgService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error servidor'
                    });
                }
            }
        });
    }
    /**
     * Actualizar geocerca existente
     */
    /*
    async actualizarGeocerca(): Promise<void> {
        if (!this.modoEdicion || !this.geocercaOriginal) {
            this.msgService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No hay una geocerca en modo de edición'
            });
            return;
        }

        if (this.MotivoNuevoForm.invalid || !this.centroGeocerca) {
            this.msgService.add({
                severity: 'error',
                summary: 'Error de validación',
                detail: 'Complete todos los campos requeridos'
            });
            return;
        }

        try {
            const area = GeocercaMapper.calculateArea(this.drawingState?.coordenadas || this.coordenadasGeocerca);
            const perimetro = GeocercaMapper.calculatePerimeter(this.drawingState?.coordenadas || this.coordenadasGeocerca);

            const updateDto: ActualizarGeocercaDto = {
                geocnom: this.MotivoNuevoForm.get('geocnom')?.value,
                geocsec: this.extractFormValue('geocsec', 'parroquia'),
                geocdirre: this.MotivoNuevoForm.get('geocdirre')?.value,
                geocciud: this.extractFormValue('geocciud', 'canton'),
                geocprov: this.extractFormValue('geocprov', 'provincia'),
                geocpais: this.MotivoNuevoForm.get('geocpais')?.value || 'ECUADOR',
                geoclat: this.centroGeocerca.lat,
                geoclon: this.centroGeocerca.lng,
                geoccoor: this.formatCoordinatesForUpdate(),
                geocarm: Math.round(area),
                geocperm: Math.round(perimetro),
                geocest: this.geocercaOriginal.geocest,
                motvact: this.MotivoNuevoForm.get('motvact')?.value,
                geocpri: this.MotivoNuevoForm.get('geocpri')?.value,
                motvnom: this.MotivoNuevoForm.get('motvnom')?.value,
                geocusedi: this.authService.getUsuarioFromToken() || 'SUPERVISOR',
                geoceqedi: this.enterpriseName
            };

            const response = await firstValueFrom(
                this.geocercaService.actualizarGeocerca(
                    this.geocercaOriginal.motvcod,
                    updateDto
                )
            );

            if (response && response.success) {
                this.geocercaDialog = false;
                this.cancelarEdicion();

                this.msgService.add({
                    severity: 'success',
                    summary: 'Geocerca actualizada',
                    detail: `La geocerca "${updateDto.geocnom}" se ha actualizado exitosamente`
                });

                this.refreshData();
            }

        } catch (error: any) {
            console.error('Error al actualizar geocerca:', error);
            this.msgService.add({
                severity: 'error',
                summary: 'Error al actualizar',
                detail: 'No se pudo actualizar la geocerca'
            });
        }
    }
*/
    /**
     * Extraer valor de campo que puede ser string u objeto
     */
    private extractFormValue(fieldName: string, property: string): string {
        const value = this.MotivoNuevoForm.get(fieldName)?.value;

        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'object' && value[property]) {
            return value[property];
        }

        return '';
    }

    /**
     * Formatear coordenadas para actualización
     */
    private formatCoordinatesForUpdate(): CoordenadaDto[] {
        const coordinates = this.drawingState?.coordenadas || this.coordenadasGeocerca;
        return coordinates.map(coord => ({
            lat: Math.round(coord.lat * 1000000) / 1000000,
            lng: Math.round(coord.lng * 1000000) / 1000000
        }));
    }

    /**
     * Cancelar edición
     */
    cancelarEdicion(): void {
        this.modoEdicion = false;
        this.editandoGeocerca = false;
        this.geocercaOriginal = null;

        this.geocercaDrawing.cancelarCreacion();
        this.MotivoNuevoForm.get('motvcod')?.enable();
        this.resetCodeValidation();

        this.msgService.add({
            severity: 'info',
            summary: 'Edición cancelada',
            detail: 'Se ha cancelado la edición de la geocerca'
        });
    }

    //MÉTODO PARA CREAR GEOCERCAS//

    /**
     * Verifica si la geocerca actual se puede finalizar
     */
    get puedeFinalizarGeocerca(): boolean {
        return !!this.centroGeocerca && (this.tipoGeocerca === 'circular' || (this.tipoGeocerca === 'poligono' && this.coordenadasGeocerca.length >= 3));
    }

    // En OnlyGeocercasComponent - Método iniciarEdicionEnMapa()
    private iniciarEdicionEnMapa(geocerca: GeofenceDto): void {
        // Limpiar estado actual del drawing service
        this.geocercaDrawing.cancelarCreacion();

        // Extraer coordenadas de la geocerca
        let coordenadas: CoordenadaDto[] = [];
        try {
            coordenadas = JSON.parse(geocerca.geoccoor);
        } catch (error) {
            console.error('Error parseando coordenadas:', error);
        }

        // Configurar estado inicial para edición usando el nuevo método
        setTimeout(() => {
            this.geocercaDrawing.cargarGeocercaParaEdicion(  // ← AQUÍ SE USA
                this.tipoGeocerca,
                coordenadas,
                { lat: geocerca.geoclat, lng: geocerca.geoclon },
                this.tipoGeocerca === 'circular' ? this.radioGeocerca : undefined
            );
        }, 500);
    }

    /**
     * Iniciar creación de nueva geocerca
     */
    iniciarCreacionGeocerca(): void {
        if (!this.mapInitialized) {
            this.msgService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Espere a que el mapa se inicialice completamente'
            });
            return;
        }

        // Limpiar selección actual
        this.selectedGeocerca = null;

        // Iniciar drawing con el servicio
        this.geocercaDrawing.iniciarCreacionGeocerca(this.tipoGeocerca);

        this.msgService.add({
            severity: 'info',
            summary: 'Modo creación activado',
            detail: `Haga clic en el mapa para crear una geocerca ${this.tipoGeocerca}`,
            life: 2000
        });
    }





    /**
     * Cambiar tipo de geocerca durante la creación
     */
    onTipoGeocercaChange(): void {
        if (this.creandoGeocerca) {
            // Cancelar creación actual y reiniciar con nuevo tipo
            this.geocercaDrawing.cancelarCreacion();

            setTimeout(() => {
                this.geocercaDrawing.iniciarCreacionGeocerca(this.tipoGeocerca);
            }, 100);
        }
    }

    /**
     * Actualizar radio del círculo
     */
    actualizarRadioCirculo(): void {
        if (this.tipoGeocerca === 'circular' && this.creandoGeocerca) {
            this.geocercaDrawing.cambiarRadioCirculo(this.radioGeocerca);
        }
    }

    /**
     * Deshacer último punto (para polígonos)
     */
    deshacerUltimoPunto(): void {
        if (this.coordenadasGeocerca.length > 0) {
            // Remover el último punto del estado local
            this.coordenadasGeocerca.pop();

            // Actualizar el servicio de drawing
            if (this.drawingState) {
                this.drawingState.coordenadas = [...this.coordenadasGeocerca];

                // Actualizar visualización (esto requiere acceso a métodos privados del servicio)
                // Por ahora, reiniciamos la creación
                this.geocercaDrawing.cancelarCreacion();
                setTimeout(() => {
                    this.geocercaDrawing.iniciarCreacionGeocerca(this.tipoGeocerca);

                    // Restaurar puntos (esto requeriría un método en el servicio)
                    // Por simplicidad, el usuario tendrá que volver a hacer los puntos
                }, 100);
            }
        }
    }
    /**
     * Limpiar dibujo actual
     */
    limpiarDibujo(): void {
        // Delegar la limpieza del mapa al servicio de dibujo
        this.geocercaDrawing.cancelarCreacion();
        this.geocercaDrawing.cancelarEdicion();

        // IMPORTANTE: Resetear también las variables del componente
        this.coordenadasGeocerca = [];
        this.radioGeocerca = 100;
        this.tipoGeocerca = 'circular';

        // NO resetear creandoGeocerca/editandoGeocerca/modoEdicion aquí
        // Solo limpiar el dibujo, mantener el modo activo

        this.msgService.add({
            severity: 'info',
            summary: 'Dibujo limpiado',
            detail: 'Se ha limpiado el dibujo actual'
        });
    }

    // Función separada para cancelar completamente (cerrar el panel)
    cancelarGestionGeocerca(): void {
        // Primero limpiar el dibujo
        this.geocercaDrawing.cancelarCreacion();
        this.geocercaDrawing.cancelarEdicion();

        // Luego resetear TODAS las variables de estado
        this.creandoGeocerca = false;
        this.editandoGeocerca = false;
        this.modoEdicion = false;  // Resetear también esta variable
        this.coordenadasGeocerca = [];
        this.radioGeocerca = 100;
        this.tipoGeocerca = 'circular';

        // Limpiar la geocerca original si estaba editando
        this.geocercaOriginal = null;

        this.msgService.add({
            severity: 'info',
            summary: 'Cancelado',
            detail: 'Operación cancelada'
        });
    }




    /**
     * Abrir diálogo para configurar y guardar geocerca
     */
    abrirDialogoGeocerca(): void {
        if (!this.centroGeocerca || (this.tipoGeocerca === 'poligono' && this.coordenadasGeocerca.length < 3)) {
            this.msgService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: this.tipoGeocerca === 'poligono' ?
                    'Necesita al menos 3 puntos para crear un polígono' :
                    'Debe colocar el centro de la geocerca'
            });
            return;
        }

        // Resetear formulario y estados de validación
        this.resetFormNuevo();
        this.resetCodeValidation();

        // Abrir diálogo
        this.geocercaDialog = true;
    }
    private resetFormNuevo(): void {
        this.MotivoNuevoForm.reset({
            motvcod: '',
            motvact: true,
            motvnom: ''
        });

        /*// Limpiar estados de ubicación
        this.provinciaSeleccionada = null;
        this.ciudadSeleccionada = null;
        this.provinciasFiltradas = [];
        this.ciudadesFiltradas = [];
        this.sectoresFiltrados = [];*/
    }

    cerrarDialogoNuevo(): void {
        this.DialogNuevo = false;
    }

    BoolValidandoCodigo = false;
    BoolvalidarCodigoNuevoMotivo = "";
    validarCodigoNuevoMotivo(): void {
        this.BoolValidandoCodigo = true;
        this.BoolvalidarCodigoNuevoMotivo = "";

        this._MotivoService.GETValidarCodigo(this.MotivoNuevoForm.get('motvcod')?.value).subscribe({
            next: () => {
                this.BoolvalidarCodigoNuevoMotivo = 'valid';
                this.BoolValidandoCodigo = false;
            },
            error: (err) => {
                this.BoolvalidarCodigoNuevoMotivo = 'invalid';
                this.BoolValidandoCodigo = false;
            }
        });

    }
    guardarNuevoMotivo(): void {
        if (this.BoolvalidarCodigoNuevoMotivo !== 'valid') {
            this.msgService.add({
                severity: 'warn',
                summary: 'Código inválido',
                detail: 'Codigo no Disponible'
            });
            return;
        }
        if (this.MotivoNuevoForm.invalid) {
            this.MotivoNuevoForm.markAllAsTouched();
            this.msgService.add({
                severity: 'error',
                summary: 'Error de validación',
                detail: 'Complete todos los campos requeridos'
            });
            return;
        }
        let cuerpoMotivo: MotivoResponse = {
            motvcod: this.MotivoNuevoForm.get('motvcod')?.value,
            motvnom: this.MotivoNuevoForm.get('motvnom')?.value,
            motvact: this.MotivoNuevoForm.get('motvact')?.value
        };
        this._MotivoService.POSTNuevo(cuerpoMotivo).subscribe({
            next: () => {
                this.msgService.add({
                    severity: 'success',
                    summary: 'Exito',
                    detail: `Registro guardado`
                });
                this.cerrarDialogoNuevo();
                this.getAllMotivos();
                this.resetFormNuevo();
            },
            error: (err) => {
                if (err.status === 409) {
                    this.msgService.add({
                        severity: 'warn',
                        summary: 'Conflicto',
                        detail: 'Codigo ya existe'
                    });
                } else {
                    this.msgService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No fue posible registrar'
                    });
                }
            }
        });
    }

    getGeocercaStatusClasses(geocerca: any): string {
        const baseClasses = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm';

        if (geocerca.motvact) {
            return `${baseClasses} bg-green-100/80 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40`;
        } else {
            return `${baseClasses} bg-gray-100/80 text-gray-700 border-gray-200/60 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700/40`;
        }
    }

    //======= FUNCIÓN PARA OBTENER TODAS LAS GEOCERCAS ===================//
    getAllGeocercas(): void {  //borrar
        if (!this.enterpriseName) {
            this.loading = false;
            return;
        }

        this.loading = true;
        this.geocercaService.getOnlyGeocercasByEnterpriseName(this.enterpriseName, 1, 50).subscribe({
            next: (response: GeocercaValidationResponse) => {
                if (response.success && response.data?.data) {
                    this.geocercas = response.data.data;
                    this.filteredGeocercas = [...this.geocercas];
                    this.updatePagination();
                    this.loading = false;
                } else {
                    this.loading = false;
                    this.msgService.add({
                        severity: 'warn',
                        summary: 'Advertencia',
                        detail: response.message || 'No se encontraron geocercas'
                    });
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error al cargar geocercas:', error);
                this.loading = false;
                this.msgService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar las geocercas'
                });
            }
        });
    }

    ultimocodigo: string = "";
    getAllMotivos(): void {
        if (!this.enterpriseName) {
            this.loading = false;
            return;
        }
        this.loading = true;
        this._MotivoService.getAllMotivosVisita().subscribe({
            next: (response: MotivoResponse[]) => {
                if (response.length > 0) {
                    this.ultimocodigo = response[0].motvcod;
                    this.motivos = response.sort((a, b) => a.motvnom.localeCompare(b.motvnom));;
                    //console.log(this.ultimocodigo);
                    //this.filteredmotivos = [...this.motivos];
                    //this.updatePagination();

                    this.loading = false;
                } else {
                    this.loading = false;
                    this.msgService.add({
                        severity: 'warn',
                        summary: 'Advertencia',
                        detail: 'Sin Registros'
                    });
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error al cargar geocercas:', error);
                this.loading = false;
                this.msgService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar registros'
                });
            }
        });
    }

    //======= FUNCIONES PARA BUSQUEDA DE GEOCERCAS ===================//
    onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value.toLowerCase();
        this.filteredmotivos = this.motivos.filter(
            (motivo) =>
                motivo.motvcod.toLowerCase().includes(value) ||
                motivo.motvnom.toLowerCase().includes(value)
        );
        this.first = 0;
        this.updatePagination();
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.itemsPerPage = event.rows;
        this.updatePagination();
    }

    updatePagination(): void {
        const start = this.first;
        const end = start + this.itemsPerPage;
        //this.paginatedGeocercas = this.filteredmotivos.slice(start, end);
        this.paginatedmotivos = this.filteredmotivos.slice(start, end);

    }

    selectGeocerca(geocerca: GeofenceDto): void {
        this.selectedGeocerca = geocerca;
        this.mapService.focusOnGeocerca(geocerca);
        this.mapService.addGeocercaMarkers([geocerca]);
    }

    searchLocationOnMap(): void {
        if (!this.searchLocation.trim()) return;

        this.mapService.searchLocation(this.searchLocation).subscribe({
            next: (results) => {
                if (results.length === 1) {
                    this.selectSearchResult(results[0]);
                } else if (results.length === 0) {
                    this.msgService.add({
                        severity: 'info',
                        summary: 'Sin resultados',
                        detail: 'No se encontraron ubicaciones para la búsqueda'
                    });
                }
            },
            error: (error) => {
                console.error('Error en búsqueda:', error);
            }
        });
    }

    selectSearchResult(result: SearchResult): void {
        this.mapService.selectSearchResult(result);
    }

    clearLocationSearch(): void {
        this.searchLocation = '';
        this.mapService.clearSearchMarker();
        this.searchResults = [];
    }
    //=================================================================//

    //======= FUNCIONES PARA RESETEO DE MAPA/DATA =========================//
    resetMapView(): void {
        this.mapService.resetMapView();
    }

    refreshData(): void {
        this.loading = true;
        this.getAllMotivos();
    }

    //======= FUNCIONES GETTERS PARA OBTENER ESTADO DE GEOCERCA =================//

    /*
        getGeocercaStatusText(geocerca: GeofenceDto): string {
            return geocerca.motvact ? 'Activa' : 'Inactiva';
        }*/



    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.geocercaDrawing.cleanupOnDestroy();
        this.mapService.destroyMap();
    }
}
