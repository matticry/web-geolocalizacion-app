
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActualizarGeocercaDto, CrearGeocercaDto, GeocercaResponseDto } from '../models/Geocercas/GeocercaDto';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { CreateGeofenceDto, GeocercaValidationResponse } from '@/core/models/Geocercas/GeocercaValidationResponseDto';
import { AsignarGeocercaDto } from '@/core/models/AsignarGeocercaDto';
import { MotivoResponse } from '../models/Motivo/Motivo';

@Injectable({
    providedIn: 'root'
})
export class MotivoService {
    private readonly baseUrl = environment.apiUrl+"/motivo";
    private readonly authService = inject(AuthService);

    constructor(private readonly http: HttpClient) { }

    getAllMotivosVisita(): Observable<MotivoResponse[]> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.get<MotivoResponse[]>(
            `${this.baseUrl}/listacompleta/`,
            { headers }
        );
    }
    GETValidarCodigo(codigo: string): Observable<void> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.get<void>(
            `${this.baseUrl}/validarcodigo?codigo=${codigo}`,
            { headers }
        );
    }
    POSTNuevo(cuerpo: MotivoResponse): Observable<void> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.post<void>(
            `${this.baseUrl}/nuevo`,cuerpo,{ headers }
        );
    }
    GETEliminar(codigo: string): Observable<void> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.get<void>(
            `${this.baseUrl}/eliminar?codigo=${codigo}`,
            { headers }
        );
    }
    POSTEditar(cuerpo: MotivoResponse): Observable<void> {
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
        return this.http.post<void>(
            `${this.baseUrl}/editar`,cuerpo,{ headers }
        );
    }

}