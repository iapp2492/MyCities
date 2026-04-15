export interface LocationFilterOption
{
    filterType: 'region' | 'country';

    filterId: number;

    filterValue: string;

    filterLabel: string;
}