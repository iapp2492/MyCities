import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from 'rxjs';
import { MyCityDto } from "../../../models/myCityDto";
import { API_BASE_URL } from "../tokens/api-base-url.token";

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


}