using System;
using System.Collections.Generic;

namespace APILABORATORIO.Models;

public partial class Medico
{
    public int Idmedico { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Especialidad { get; set; }

    public string? Password { get; set; }

    public int? Telefono { get; set; }

    public string? Rol { get; set; }

    public string? Correo { get; set; }

    public string? ResetToken { get; set; }

    public DateTime? ResetTokenExpires { get; set; }

    public bool ContrasenaTemporal { get; set; }

    public virtual ICollection<Factura> Facturas { get; set; } = new List<Factura>();

    public virtual ICollection<Orden> Ordens { get; set; } = new List<Orden>();
}
