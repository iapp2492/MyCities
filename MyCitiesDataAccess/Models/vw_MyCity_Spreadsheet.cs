using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyCitiesDataAccess.Models;

[Keyless]
public partial class vw_MyCity_Spreadsheet
{
    [StringLength(100)]
    public string City { get; set; } = null!;

    [StringLength(150)]
    public string Country { get; set; } = null!;

    [StringLength(50)]
    public string Region { get; set; } = null!;

    [Column(TypeName = "decimal(9, 6)")]
    public decimal Lat { get; set; }

    [Column(TypeName = "decimal(9, 6)")]
    public decimal Lon { get; set; }

    [StringLength(50)]
    public string StayDuration { get; set; } = null!;

    public string? Decades { get; set; }

    public string? Notes { get; set; }
}
