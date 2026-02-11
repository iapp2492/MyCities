export interface MyCityDto {
    id: number;
    city: string;
    country: string;
    region: string;
    lat: number;
    lon: number;
    stayDuration: string;
    decades: string;
    notes: string | null;
}