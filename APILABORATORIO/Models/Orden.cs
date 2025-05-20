using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class Orden
{
    public int Idorden { get; set; }

    public int? Idcliente { get; set; }

    public int? Idmedico { get; set; }

    public DateTime? FechaOrden { get; set; }

    public string? Estado { get; set; }

    public DateTime? FechaEntrega { get; set; }

    public virtual ICollection<DetalleOrden> DetalleOrdens { get; set; } = new List<DetalleOrden>();

    public virtual Cliente? IdclienteNavigation { get; set; }

    public virtual Medico? IdmedicoNavigation { get; set; }
}
