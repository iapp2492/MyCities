export interface MyCityDto {
    id: number;
    city: string;
    region: string;
    regionId: number;  
    country: string;
    countryId: number; 
    lat: number;
    lon: number;
    stayDuration: string;
    decades: string;
    notes: string | null;
    photoKey: number | null;
}