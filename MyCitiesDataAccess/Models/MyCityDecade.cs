using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace MyCitiesDataAccess.Models;

[Table("MyCityDecade")]
[Index("MyCityId", "DecadeId", Name = "UQ_MyCityDecade_MyCity_Decade", IsUnique = true)]
public partial class MyCityDecade
{
    public int MyCityId { get; set; }

    public int DecadeId { get; set; }

    [Key]
    public int MyCityDecadeId { get; set; }

    [ForeignKey("DecadeId")]
    [InverseProperty("MyCityDecades")]
    public virtual Decade Decade { get; set; } = null!;

    [ForeignKey("MyCityId")]
    [InverseProperty("MyCityDecades")]
    public virtual MyCity MyCity { get; set; } = null!;
}
