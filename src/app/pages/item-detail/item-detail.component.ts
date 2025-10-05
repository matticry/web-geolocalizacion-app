import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { MessageService } from 'primeng/api';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { CUltimoRegxUsu } from '@/core/models/CUltimoRegxUsu';
import { MapService, SearchResult } from '@/core/services/map.service';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '@/core/services/user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { GeocercaDto, VendedorDto } from '@/core/models/Geocercas/VendedorDto';
import { Tooltip } from 'primeng/tooltip';
import { Badge } from 'primeng/badge';
import { CustomerService } from '@/core/services/customer.service';
import { Select } from 'primeng/select';
import { CustomerResponseDto } from '@/core/models/Customer/CustomerResponseDto';

@Component({
    selector: 'app-item-detail',
    imports: [
        Accordion,
        AccordionContent,
        FormsModule,
        DatePicker,
        NgClass,
        Checkbox,
        Button,
        TableModule,
        IconField,
        InputIcon,
        InputText,
        AccordionPanel,
        AccordionHeader,
        DatePipe,
        CurrencyPipe,
        Tooltip,
        Badge,
        Select
    ],
    templateUrl: './item-detail.component.html',
    styleUrl: './item-detail.component.scss',
    standalone: true,
    providers: [MapService]
})
export class ItemDetailComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

    // Subject para manejo de subscripciones
    private destroy$ = new Subject<void>();

    active: number = 0;
    activeIndex: number | undefined = 0;

    // Propiedades de usuarios
    users: CUltimoRegxUsu[] = [];
    filteredUsers: CUltimoRegxUsu[] = [];
    paginatedUsers: CUltimoRegxUsu[] = [];
    selectedUser: CUltimoRegxUsu | null = null;
    loading: boolean = true;

    // Propiedades de paginación
    first: number = 0;
    itemsPerPage: number = 5;

    // Propiedades para geocercas
    vendorGeocercas: GeocercaDto[] = [];
    loadingGeocercas: boolean = false;
    selectedVendor: VendedorDto | null = null;

    // Propiedades del mapa (delegadas al servicio)
    searchLocation: string = '';
    searchingLocation: boolean = false;
    searchResults: SearchResult[] = [];
    mapInitialized: boolean = false;
    loadingMap: boolean = false;

    // Propiedades de filtros
    filterFrom: Date | null = null;
    selectedTimeUnit: any = null;
    timeValue: number | null = null;
    selectedGeofence: string[] = [];
    geofenceEnabled: boolean = true;
    pedidosEnabled: boolean = false;
    collectionsEnabled: boolean = false;
    clientesNone: boolean = false;
    clientesAll: boolean = false;
    clientesAssigned: boolean = false;
    geofenceOptions: any[] = [];

    // Propiedades para el loading
    loadingFilters: boolean = false;

    // Propiedades de filtros actualizadas
    filterTo: Date | null = null;

    // Propiedades de tablas
    totalRecords: number = 0;
    loadingTable: boolean = false;
    tableData: any[] = [];

    // Opciones para multiselects
    vendorOptions: any[] = [];
    customerOptions: any[] = [];
    selectedCustomer: string | null = null;
    loadingCustomers: boolean = false;


    constructor(
        private readonly userService: UserService,
        private readonly msgService: MessageService,
        private readonly mapService: MapService,
        private readonly customerService: CustomerService
    ) {}

    //region Lifecycle Hooks

    ngOnInit(): void {
        this.getAllUsers();
        this.subscribeToMapService();
    }

    ngAfterViewInit(): void {
        requestAnimationFrame(() => {
            this.initializeMap().then(() => {});
        });
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.mapService.destroyMap();
    }

    /**
     * Suscribe a los observables del servicio de mapas
     */
    private subscribeToMapService(): void {
        // Estado de inicialización del mapa
        this.mapService.isMapInitialized$.pipe(takeUntil(this.destroy$)).subscribe((initialized) => {
            this.mapInitialized = initialized;
        });
        this.mapService.isSearchingLocation$.pipe(takeUntil(this.destroy$)).subscribe((searching) => {
            this.searchingLocation = searching;
        });

        this.mapService.searchResultsList$.pipe(takeUntil(this.destroy$)).subscribe((results) => {
            this.searchResults = results;
        });
    }

    getCustomersByCodeVendor(vendorCode: string): void {
        this.loadingCustomers = true;

        this.customerService.getCustomersByCodeVendor(vendorCode).subscribe({
            next: (customers: CustomerResponseDto[]) => {
                this.mapCustomersToOptions(customers);
                this.loadingCustomers = false;

                this.msgService.add({
                    severity: 'success',
                    summary: 'Clientes cargados',
                    detail: `${customers.length} clientes encontrados`,
                    life: 2000
                });
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error al cargar clientes:', error);
                this.loadingCustomers = false;
                this.customerOptions = [];

                this.msgService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los clientes del vendedor'
                });
            }
        });
    }

    // Mapear clientes a opciones
    private mapCustomersToOptions(customers: CustomerResponseDto[]): void {
        this.customerOptions = customers.map(customer => ({
            label: customer.dirnombre,
            value: customer.dirclave,
            customer: customer,
            subtitle: `${customer.dirruc} • Código: ${customer.dirclave}`
        }));
    }

    // Método para manejar cambios en la selección de clientes (ahora selección única)
    onCustomerChange(event: any): void {
        const selectedCode = event.value;

        if (selectedCode) {
            const selectedCustomer = this.customerOptions.find(option => option.value === selectedCode);

            this.msgService.add({
                severity: 'info',
                summary: 'Cliente seleccionado',
                detail: `Cliente: ${selectedCustomer?.label || selectedCode}`,
                life: 2000
            });
        } else {
            this.msgService.add({
                severity: 'info',
                summary: 'Selección removida',
                detail: 'Ningún cliente seleccionado',
                life: 2000
            });
        }
    }


    getAllUsers(): void {
        this.loading = true;
        this.userService.getAllListUser().subscribe({
            next: (data: CUltimoRegxUsu[]) => {
                this.users = data;
                this.filteredUsers = [...this.users];
                this.updatePagination();
                this.loading = false;
                this.mapUsersToVendorOptions(this.users);

                // Si el mapa está inicializado, agregar marcadores
                if (this.mapInitialized) {
                    this.mapService.addUserMarkers(this.users);
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error al cargar usuarios:', error);
                this.loading = false;
                this.msgService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los usuarios'
                });
            }
        });
    }

    // Nuevo método para mapear usuarios a opciones

    private mapUsersToVendorOptions(users: CUltimoRegxUsu[]): void {
        this.vendorOptions = users.map((user) => ({
            label: user.usunombre,
            value: user.usucodv,
            user: user, // Guardar referencia completa del usuario
            subtitle: `${user.usuemail || 'Sin correo electrónico'}`
        }));
    }

    /*
     * Obtiene el número de filtros activos
     */
    getActiveFiltersCount(): number {
        let count = 0;
        if (this.filterFrom) count++;
        if (this.geofenceEnabled && this.selectedGeofence) count++;
        if (this.pedidosEnabled) count++;
        if (this.collectionsEnabled) count++;
        if (this.timeValue && this.selectedTimeUnit) count++;
        if (this.clientesNone || this.clientesAll || this.clientesAssigned) count++;
        return count;
    }

    onToggleChange() {
        if (this.geofenceEnabled) {
            if (this.vendorGeocercas.length > 0) {
                this.selectedGeofence = this.vendorGeocercas.map((geocerca) => geocerca.geoccod);
                this.onGeofencesChange({ value: this.selectedGeofence });
            }
        } else {
            this.selectedGeofence = [];
            this.mapService.clearGeocercas();

            this.msgService.add({
                severity: 'info',
                summary: 'Geocercas deshabilitadas',
                detail: 'Se ha limpiado la selección de geocercas',
                life: 2000
            });
        }
    }

    // Métodos de tabla
    clearTableFilters(dt: any): void {
        dt.clear();
        this.msgService.add({
            severity: 'info',
            summary: 'Filtros de tabla',
            detail: 'Filtros de tabla limpiados'
        });
    }

    onGlobalFilter(dt: any, event: Event): void {
        dt.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    onVendorChange(event: any): void {
        const selectedCode = event.value; // Ahora es un string único

        if (selectedCode) {
            const selectedUser = this.users.find(user => user.usucodv === selectedCode);

            if (selectedUser) {
                // Limpiar clientes anteriores
                this.customerOptions = [];
                this.selectedCustomer = null;

                // Cargar clientes del vendedor seleccionado
                this.getCustomersByCodeVendor(selectedCode);

                // Actualizar mapa con el vendedor seleccionado
                this.mapService.clearUserMarkers();
                this.mapService.addUserMarkers([selectedUser]);
                this.mapService.focusOnUser(selectedUser);

                this.msgService.add({
                    severity: 'success',
                    summary: 'Vendedor seleccionado',
                    detail: `Cargando clientes de ${selectedUser.usunombre}`,
                    life: 3000
                });
            }
        } else {
            // Si no hay selección, mostrar todos los usuarios
            this.customerOptions = [];
            this.selectedCustomer = null;
            this.mapService.clearUserMarkers();
            this.mapService.addUserMarkers(this.users);

            this.msgService.add({
                severity: 'info',
                summary: 'Selección removida',
                detail: 'Mostrando todos los vendedores',
                life: 2000
            });
        }
    }


    // Método para manejar cambios en la selección

    onGeofencesChange(event: any): void {
        const selectedCodes = event.value; // Array de códigos seleccionados

        const selectedGeocercasData = this.vendorGeocercas.filter((geocerca) => selectedCodes.includes(geocerca.geoccod));

        if (selectedGeocercasData.length > 0) {
            this.mapService.displayVendorGeocercas(selectedGeocercasData);

            this.msgService.add({
                severity: 'info',
                summary: 'Filtro aplicado',
                detail: `Mostrando ${selectedGeocercasData.length} de ${this.vendorGeocercas.length} geocerca${selectedGeocercasData.length === 1 ? '' : 's'}`,
                life: 2000
            });
        } else {
            this.mapService.clearGeocercas();
            this.msgService.add({
                severity: 'warn',
                summary: 'Sin filtro',
                detail: 'No hay geocercas seleccionadas para mostrar',
                life: 2000
            });
        }
    }

    // Método para manejar cambios en la selección de vendedores
    onVendorsChange(event: any): void {
        const selectedCodes = event.value; // Array de códigos seleccionados

        // Filtrar usuarios seleccionados
        const selectedUsers = this.users.filter((user) => selectedCodes.includes(user.usucod));

        if (selectedUsers.length > 0) {
            // Actualizar marcadores en el mapa
            this.mapService.clearUserMarkers();
            this.mapService.addUserMarkers(selectedUsers);

            this.msgService.add({
                severity: 'success',
                summary: 'Vendedores filtrados',
                detail: `Mostrando ${selectedUsers.length} de ${this.users.length} vendedor${selectedUsers.length === 1 ? '' : 'es'}`,
                life: 3000
            });
        } else {
            // Mostrar todos los usuarios si no hay selección
            this.mapService.clearUserMarkers();
            this.mapService.addUserMarkers(this.users);

            this.msgService.add({
                severity: 'info',
                summary: 'Filtro removido',
                detail: 'Mostrando todos los vendedores',
                life: 2000
            });
        }
    }

    onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value.toLowerCase();
        this.filteredUsers = this.users.filter((user) => user.usunombre.toLowerCase().includes(value) || user.usucod.toLowerCase().includes(value) || user.usuemail.toLowerCase().includes(value));
        this.first = 0;
        this.updatePagination();
    }

    updatePagination(): void {
        const start = this.first;
        const end = start + this.itemsPerPage;
        this.paginatedUsers = this.filteredUsers.slice(start, end);
    }

    selectUser(user: CUltimoRegxUsu): void {
        this.selectedUser = user;
        this.mapService.focusOnUser(user);
    }

    async initializeMap(): Promise<void> {
        try {
            await this.mapService.initializeMap(this.mapContainer, {
                center: [-0.2298, -78.5249],
                zoom: 13,
                defaultLocation: 'Quito, Ecuador'
            });
            if (!this.loading && this.users.length > 0) {
                this.mapService.addUserMarkers(this.users);
            }
        } catch (error) {
            console.error('Error al inicializar el mapa:', error);
        }
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

    applyFilters(): void {}

    selectSearchResult(result: SearchResult): void {
        this.mapService.selectSearchResult(result);
    }

    clearLocationSearch(): void {
        this.searchLocation = '';
        this.mapService.clearSearchMarker();
        this.searchResults = [];
    }

    resetMapView(): void {
        this.mapService.resetMapView();
    }

    refreshData(): void {
        this.loading = true;
        this.selectedUser = null;
        this.getAllUsers();
        this.resetMapView();
    }

    clearFilters(): void {
        // Filtros temporales
        this.filterFrom = null;
        this.filterTo = null;
        this.selectedTimeUnit = null;
        this.timeValue = null;

        // Filtros de vendedor y clientes
        this.selectedVendor = null;
        this.selectedCustomer = null;
        this.customerOptions = [];

        // Filtros espaciales
        this.geofenceEnabled = false;
        this.selectedGeofence = [];

        // Filtros de transacciones
        this.pedidosEnabled = false;
        this.collectionsEnabled = false;

        // Filtros de clientes (si los tienes)
        this.clientesNone = false;
        this.clientesAll = false;
        this.clientesAssigned = false;

        // Restaurar vista del mapa con todos los usuarios
        if (this.users.length > 0) {
            this.mapService.clearUserMarkers();
            this.mapService.addUserMarkers(this.users);
            this.mapService.resetMapView();
        }

        this.msgService.add({
            severity: 'info',
            summary: 'Filtros limpiados',
            detail: 'Todos los filtros han sido reiniciados'
        });
    }

    exportToExcel() {}
}
