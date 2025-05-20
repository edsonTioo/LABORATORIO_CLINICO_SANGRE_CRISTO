using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class ResultadoExaman
{
    public int Idresultado { get; set; }

    public int? IddetalleOrden { get; set; }

    public int? Idparametro { get; set; }

    public string? Resultado { get; set; }

    public DateTime? FechaResultado { get; set; }

    public string? NombreParametro { get; set; }

    public virtual DetalleOrden? IddetalleOrdenNavigation { get; set; }

    public virtual Parametro? IdparametroNavigation { get; set; }
}
