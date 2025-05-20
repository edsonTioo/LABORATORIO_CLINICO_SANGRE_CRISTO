using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class TipoExaman
{
    public int IdtipoExamen { get; set; }

    public string NombreExamen { get; set; } = null!;

    public string? Descripcion { get; set; }
    public string Subtitulos { get; set; } // Nuevo campo: "Físico,Químico,Microscópico"

    public decimal Precio { get; set; }

    public virtual ICollection<DetalleOrden> DetalleOrdens { get; set; } = new List<DetalleOrden>();

    public virtual ICollection<Parametro> Parametros { get; set; } = new List<Parametro>();
}
