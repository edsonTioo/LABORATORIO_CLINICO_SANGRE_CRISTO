using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace APILABORATORIO.Models;

public partial class Parametro
{
    public int Idparametro { get; set; }

    public int? IdtipoExamen { get; set; }

    public string NombreParametro { get; set; } = null!;

    public string? Subtitulo { get; set; } // Nueva propiedad
    public string? UnidadMedida { get; set; }

    public string? ValorReferencia { get; set; }

    public string? OpcionesFijas { get; set; }

    public string Subtitulos { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Precio { get; set; }

    public virtual TipoExaman? IdtipoExamenNavigation { get; set; }

    public virtual ICollection<ResultadoExaman> ResultadoExamen { get; set; } = new List<ResultadoExaman>();
}
