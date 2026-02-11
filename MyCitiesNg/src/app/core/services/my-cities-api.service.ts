import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { Observable } from 'rxjs';
import { MyCityDto } from "../../../models/myCityDto";

@Injectable({
    providedIn: 'root'
})
export class MyCitiesApiService 
{
    private readonly apiBaseUrl: string = environment.dataserviceroot;

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