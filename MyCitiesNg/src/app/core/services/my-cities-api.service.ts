import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from 'rxjs';
import { MyCityDto } from "../../../models/myCityDto";
import { API_BASE_URL } from "../tokens/api-base-url.token";
import { MyCityPhotosResponseDto } from "../../../models/MyCityPhotosResponseDto";
import { DebugLoggerService } from "./debug-logger.service";
import { LocationFilterOption } from "../../../models/LocationFilterOption";

@Injectable({
    providedIn: 'root'
})
export class MyCitiesApiService 
{
    private readonly apiBaseUrl = inject(API_BASE_URL);

    // Dependency injections
    private http = inject(HttpClient);
    private readonly debugLogger = inject(DebugLoggerService);

    // https://localhost:7127/api/MyCities/GetAllCities 
    getAllCities(): Observable<MyCityDto[]> 
    {
        const url = `${this.apiBaseUrl}MyCities/GetAllCities`;
        // this.logger.debug('Calling API:', url);
        return this.http.get<MyCityDto[]>(url);
    }

    // https://localhost:7127/api/MyCities/GetAllPhotos
    getAllPhotos(): Observable<MyCityPhotosResponseDto[]> 
    {
        this.debugLogger.log('MyCitiesApiService: Calling getAllPhotos API');
        const url = `${this.apiBaseUrl}MyCities/GetAllPhotos`;
        return this.http.get<MyCityPhotosResponseDto[]>(url);
    }

    // https://localhost:7127/api/MyCities/GetActivePhotoKeys
    getActivePhotoKeys(): Observable<number[]>
    {
        const url = `${this.apiBaseUrl}MyCities/GetActivePhotoKeys`;
        return this.http.get<number[]>(url);
    }

    getLocationFilterOptions(): Observable<LocationFilterOption[]>
    {
        return this.http.get<LocationFilterOption[]>(
            `${this.apiBaseUrl}MyCities/GetLocationFilterOptions`
        );
    }


}