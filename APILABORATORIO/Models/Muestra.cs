using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class Muestra
{
    public int Id { get; set; }

    public string? Muestra1 { get; set; }

    public virtual ICollection<DetalleOrden> DetalleOrdens { get; set; } = new List<DetalleOrden>();
}
