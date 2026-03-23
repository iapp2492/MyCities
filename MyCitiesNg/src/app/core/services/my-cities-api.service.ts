import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from 'rxjs';
import { MyCityDto } from "../../../models/myCityDto";
import { API_BASE_URL } from "../tokens/api-base-url.token";
import { MyCityPhotosResponseDto } from "../../../models/MyCityPhotosResponseDto";

@Injectable({
    providedIn: 'root'
})
export class MyCitiesApiService 
{
    private readonly apiBaseUrl = inject(API_BASE_URL);

    // Dependency injections
    // private logger = inject(LoggerService);
    private http = inject(HttpClient);

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
        console.log('MyCitiesApiService: Calling getAllPhotos API');
        const url = `${this.apiBaseUrl}MyCities/GetAllPhotos`;
        return this.http.get<MyCityPhotosResponseDto[]>(url);
    }

    // https://localhost:7127/api/MyCities/GetActivePhotoKeys
    getActivePhotoKeys(): Observable<number[]>
    {
        const url = `${this.apiBaseUrl}MyCities/GetActivePhotoKeys`;
        return this.http.get<number[]>(url);
    }


}