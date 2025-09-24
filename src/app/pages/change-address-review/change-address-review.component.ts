import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { catchError, finalize, Observable, of, Subject, takeUntil, tap } from 'rxjs';
import { UserDto } from '@/core/models/UserDto';
import { MapService, SearchResult } from '@/core/services/map.service';
import { UserService } from '@/core/services/user.service';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { IconField } from 'primeng/iconfield';
import { InputText } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Tooltip } from 'primeng/tooltip';
import { Paginator } from 'primeng/paginator';
import { InputIconModule } from 'primeng/inputicon';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { CustomerService } from '@/core/services/customer.service';
import { CustomerUpdateInfo } from '@/core/models/Customer/CustomerUpdateInfo';
import { SolicitudData } from '@/core/models/SolicitudData';
import { UpdateCustomerLocation } from '@/core/models/Customer/UpdateCustomerLocation';


@Component({
    selector: 'app-change-address-review',
    imports: [IconField, InputText, FormsModule, Button, Tooltip, Paginator, InputIconModule, DatePipe, AsyncPipe, DecimalPipe],
    standalone: true,
    templateUrl: './change-address-review.component.html',
    styleUrl: './change-address-review.component.scss'
})
export class ChangeAddressReviewComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

    // Subject para manejo de subscripciones
    private destroy$ = new Subject<void>();

    // Propiedad para loading para anular y aplicar cambios
    loadingDesactivate: boolean = false;
    loadingAccept: boolean = false;

    //Propiedades para manejar el Detalle de la Solicitu
    selectedCustomerDetail$?: Observable<SolicitudData | null>;
    loadingCustomerDetail: boolean = false;

    // Propiedades de solicitudes de cambio de dirección
    customers: CustomerUpdateInfo[] = [];
    filteredCustomers: CustomerUpdateInfo[] = [];
    paginatedCustomers: CustomerUpdateInfo[] = [];
    selectedCustomer: CustomerUpdateInfo | null = null;
    loadingCustomers: boolean = true;

    // Propiedades de usuarios
    users: UserDto[] = [];
    filteredUsers: UserDto[] = [];
    paginatedUsers: UserDto[] = [];
    selectedUser: UserDto | null = null;
    loading: boolean = true;

    // Propiedades de paginación
    first: number = 0;
    itemsPerPage: number = 4;

    // Propiedades del mapa (delegadas al servicio)
    searchLocation: string = '';
    searchingLocation: boolean = false;
    searchResults: SearchResult[] = [];
    mapInitialized: boolean = false;

    constructor(
        private readonly userService: UserService,
        private readonly msgService: MessageService,
        private readonly mapService: MapService,
        private readonly customerService: CustomerService
    ) {}

    ngOnInit(): void {
        this.getListChangeAddressRequest();
        this.subscribeToMapService();
    }

    ngAfterViewInit(): void {
        requestAnimationFrame(() => {
            this.initializeMap().then(() => {});
        });
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

    getListChangeAddressRequest(): void {
        this.loadingCustomers = true;
        this.customerService.getListChangeAddressRequest().subscribe({
            next: (data: CustomerUpdateInfo[]) => {
                this.customers = data;
                this.filteredCustomers = [...this.customers];
                this.updatePaginationCustomers();
                this.loadingCustomers = false;
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error al cargar solicitudes de cambio de dirección:', error);
                this.loadingCustomers = false;
                this.msgService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar las solicitudes de cambio de dirección'
                });
            }
        });
    }


    // Método para aceptar solicitud
    acceptRequest(detail: SolicitudData): void {
        if (!detail) return;

        // Crear el DTO con los datos mapeados
        const requestDto: UpdateCustomerLocation = {
            nombredb: detail.solnodb,
            idsolicitud: detail.solid,
            clavecliente: detail.solclave,
            numerodireccion: detail.solnumd,
            direccion: detail.soldirnu,
            latitud: detail.sollat,
            longitud: detail.sollog
        };

        this.loadingAccept = true;

        this.customerService.updateCustomerLocation(requestDto).subscribe({
            next: (response) => {
                this.loadingAccept = false;
                this.msgService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Solicitud aceptada y ubicación actualizada'
                });

                // Refrescar datos y limpiar selección
                this.refreshData();
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error al aceptar solicitud:', error);
                this.loadingAccept = false;
                this.msgService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo aceptar la solicitud'
                });
            }
        });
    }

    updatePaginationCustomers(): void {
        const start = this.first;
        const end = start + this.itemsPerPage;
        this.paginatedCustomers = this.filteredCustomers.slice(start, end);
    }

    getAllUsers(): void {
        this.loading = true;
        this.userService.getAllListUser().subscribe({
            next: (data: UserDto[]) => {
                this.users = data;
                this.filteredUsers = [...this.users];
                this.updatePagination();
                this.loading = false;

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

    onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value.toLowerCase();
        this.filteredUsers = this.users.filter((user) => user.usunombre.toLowerCase().includes(value) || user.usucod.toLowerCase().includes(value) || user.usuemail.toLowerCase().includes(value));
        this.first = 0;
        this.updatePagination();
    }
    onSearchRequests(event: Event): void {
        const value = (event.target as HTMLInputElement).value.toLowerCase();
        this.filteredCustomers = this.customers.filter((customer) => customer.solnombre.toLowerCase().includes(value));
        this.first = 0;
        this.updatePaginationCustomers();
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.itemsPerPage = event.rows;
        this.updatePaginationCustomers();
    }

    desactivateRequest(requestId: number): void {
        if (!this.selectedCustomer) return;

        this.loadingDesactivate = true;

        this.customerService.desactiveChangeAddressRequestById(requestId).subscribe({
            next: () => {
                this.loadingDesactivate = false;
                this.msgService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Solicitud anulada correctamente'
                });

                // Refrescar datos y limpiar selección
                this.refreshData();
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error al anular solicitud:', error);
                this.loadingDesactivate = false;
                this.msgService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo anular la solicitud'
                });
            }
        });
    }

    updatePagination(): void {
        const start = this.first;
        const end = start + this.itemsPerPage;
        this.paginatedUsers = this.filteredUsers.slice(start, end);
    }

    selectUser(user: UserDto): void {
        this.selectedUser = user;
        this.mapService.focusOnUser(user);
    }
    selectCustomerRequest(customer: CustomerUpdateInfo): void {
        this.selectedCustomer = customer;
        this.loadingCustomerDetail = true;

        this.selectedCustomerDetail$ = this.customerService.getDetailChangeAddressRequestById(customer.solid).pipe(
            tap((detailData) => {

                // efecto secundario: enfocar en el mapa
                this.mapService.focusOnCustomerChangeAddress(detailData);
                this.mapService.addCustomerChangeAddressMarker([detailData]);
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('Error al cargar detalle de solicitud:', error);
                this.msgService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar el detalle de la solicitud'
                });
                return of(null); // devolvemos null para que el async pipe no rompa
            }),
            finalize(() => (this.loadingCustomerDetail = false))
        );
    }

    async initializeMap(): Promise<void> {
        try {
            await this.mapService.initializeMap(this.mapContainer, {
                center: [-0.2298, -78.5249],
                zoom: 12,
                defaultLocation: 'Quito, Ecuador',
                zoomControl: false
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
        this.loadingCustomerDetail = true;
        this.selectedCustomer = null;
        this.getListChangeAddressRequest();
        this.resetMapView();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.mapService.destroyMap();
    }
}
