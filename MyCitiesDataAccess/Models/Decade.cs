using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyCitiesDataAccess.Models;

[Table("Decade")]
[Index("StartYear", Name = "UQ_Decade_StartYear", IsUnique = true)]
public partial class Decade
{
    [Key]
    public int DecadeId { get; set; }

    public short StartYear { get; set; }

    [StringLength(7)]
    [Unicode(false)]
    public string Label { get; set; } = null!;

    public int SortOrder { get; set; }

    [InverseProperty("Decade")]
    public virtual ICollection<MyCityDecade> MyCityDecades { get; set; } = new List<MyCityDecade>();
}
