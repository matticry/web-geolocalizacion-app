import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '@/core/services/auth.service';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { CustomerResponseDto } from '@/core/models/Customer/CustomerResponseDto';
import { Observable } from 'rxjs';
import { CustomerAreaRequestDto } from '@/core/models/Customer/CustomerAreaRequestDto';
import { FilterRequest } from '@/core/models/Filter/FilterRequest';
import { TrackingResponse } from '@/core/models/Filter/TrackingResponse';
import { CustomerUpdateInfo } from '@/core/models/Customer/CustomerUpdateInfo';
import { SolicitudData } from '@/core/models/SolicitudData';
import { UpdateCustomerLocation } from '@/core/models/Customer/UpdateCustomerLocation';

@Injectable({
    providedIn: 'root'
})
export class CustomerService {
    private readonly baseUrl = environment.apiUrl;
    private readonly authService = inject(AuthService);

    constructor(private readonly http: HttpClient) { }

    getCustomersByVendorAndArea(requestDto: CustomerAreaRequestDto ): Observable<CustomerResponseDto[]> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.post<CustomerResponseDto[]>(`${this.baseUrl}/geolocalizacion/webclientezona`, requestDto, { headers });
    }
    getTrackingDetails(requestDto: FilterRequest): Observable<TrackingResponse> {
        const token = this.authService.getToken();

        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        return this.http.post<TrackingResponse>(
            `${this.baseUrl}/geolocalizacion/webconsultacompleta`,
            requestDto,
            { headers }
        );
    }

    getCustomersByCodeVendor(codvendedor: string): Observable<CustomerResponseDto[]> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        const params = new HttpParams().set('codvendedor', codvendedor);
        return this.http.get<CustomerResponseDto[]>(`${this.baseUrl}/clientes/weblistacompletafiltro`, { headers, params });
    }

    getListChangeAddressRequest(): Observable<CustomerUpdateInfo[]> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.get<CustomerUpdateInfo[]>(`${this.baseUrl}/clientes/websolicitudactualziarcliente`, { headers });
    }

    getDetailChangeAddressRequestById(id: number): Observable<SolicitudData> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        const params = new HttpParams().set('solicitud', id);

        return this.http.get<SolicitudData>(`${this.baseUrl}/clientes/websolicitudactualziarclienteunico`, { headers, params });

    }
    desactiveChangeAddressRequestById(id: number): Observable<void> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        const params = new HttpParams().set('solicitud', id);
        return this.http.get<void>(`${this.baseUrl}/clientes/webanularsolicitud`, { headers, params });
    }
    updateCustomerLocation(requestDto: UpdateCustomerLocation): Observable<UpdateCustomerLocation> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.post<UpdateCustomerLocation>(`${this.baseUrl}/clientes/webactualizarubicacioncliente`, requestDto, { headers });
    }


}
