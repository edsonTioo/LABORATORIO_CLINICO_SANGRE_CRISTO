using APILABORATORIO.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LaboratorioClinico.Controllers
{
[Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FacturaController : ControllerBase
    {
        public readonly LaboratorioClinicoContext _context;
        public FacturaController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        public class FacturaDto
        {
            public int Idcliente { get; set; }
            public DateTime FechaFactura { get; set; }
            public decimal Total { get; set; }
            public int Idmedico { get; set; }
            public string TipoFacturacion { get; set; } // "EXAMEN" o "PARAMETRO"
            public List<DetallefacturaDto> DetalleFacturas { get; set; } = new List<DetallefacturaDto>();
        }

        public class DetallefacturaDto
        {
            public int IddetalleOrden { get; set; }
            public decimal Subtotal { get; set; }
            public decimal Precio { get; set; }
            public string Nombre { get; set; } // Nombre del parámetro o examen
            public string Tipo { get; set; } // "EXAMEN" o "PARAMETRO"
            public int? Idparametro { get; set; }
            public int? IdtipoExamen { get; set; }
        }

        public class FacturaResponseDto
        {
            public int Idfactura { get; set; }
            public int Idcliente { get; set; }
            public DateTime FechaFactura { get; set; }
            public decimal Total { get; set; }
            public int IdMedico { get; set; }
            public string TipoFacturacion { get; set; }
            public List<DetallefacturaDto> DetalleFacturas { get; set; } = new List<DetallefacturaDto>();
        }

        [HttpPost]
        public async Task<IActionResult> CrearFactura([FromBody] FacturaDto facturaDto)
        {
            if (facturaDto == null)
            {
                return BadRequest("La factura es obligatoria.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Validación de los datos
                if (facturaDto.Idcliente == 0 || facturaDto.Total == 0 || 
                    string.IsNullOrEmpty(facturaDto.TipoFacturacion))
                {
                    return BadRequest("Los datos de la factura son obligatorios.");
                }

                // Crear la factura
                var factura = new Factura
                {
                    Idcliente = facturaDto.Idcliente,
                    FechaFactura = facturaDto.FechaFactura,
                    Idmedico = facturaDto.Idmedico,
                    Total = facturaDto.Total,
                    TipoFacturacion = facturaDto.TipoFacturacion
                };
                _context.Facturas.Add(factura);
                await _context.SaveChangesAsync();

                // Crear los detalles de la factura
                foreach (var detalle in facturaDto.DetalleFacturas)
                {
                    var detalleFactura = new DetalleFactura
                    {
                        IddetalleOrden = detalle.IddetalleOrden,
                        Idfactura = factura.Idfactura,
                        Subtotal = detalle.Subtotal,
                        Precio = detalle.Precio,
                        NombreParametro = detalle.Nombre,
                        Idparametro = detalle.Tipo == "PARAMETRO" ? detalle.Idparametro : null,
                        IdtipoExamen = detalle.Tipo == "EXAMEN" ? detalle.IdtipoExamen : null
                    };
                    _context.DetalleFacturas.Add(detalleFactura);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var response = new FacturaResponseDto
                {
                    Idfactura = factura.Idfactura,
                    Idcliente = factura.Idcliente ?? 0,
                    FechaFactura = factura.FechaFactura ?? DateTime.Now,
                    Total = factura.Total ?? 0,
                    IdMedico = factura.Idmedico ?? 0,
                    TipoFacturacion = factura.TipoFacturacion,
                    DetalleFacturas = facturaDto.DetalleFacturas
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }

        [HttpGet("clientes-con-ordenes-pendientes")]
        public async Task<IActionResult> ObtenerClientesConOrdenesPendientes()
        {
            var clientes = await _context.Ordens
                .Where(o => o.Estado == "PENDIENTE")
                .Include(o => o.IdclienteNavigation)
                .Select(o => new
                {
                    o.Idcliente,
                    Nombre = o.IdclienteNavigation!.Nombre
                })
                .Distinct()
                .ToListAsync();

            return Ok(clientes);
        }

        [HttpGet("examenes-pendientes/{idcliente}")]
        public async Task<IActionResult> ObtenerExamenesPendientes(int idcliente)
        {
            var examenes = await _context.DetalleOrdens
                .Where(d => d.IdordenNavigation!.Estado == "PENDIENTE" &&
                           d.IdordenNavigation.Idcliente == idcliente)
                .Include(d => d.IdtipoExamenNavigation)
                .Include(d => d.IdordenNavigation)
                .Select(d => new
                {
                    IddetalleOrden = d.IddetalleOrden,
                    IdTipoExamen = d.IdtipoExamen,
                    Nombre = d.IdtipoExamenNavigation!.NombreExamen,
                    Precio = d.IdtipoExamenNavigation.Precio,
                    IdOrden = d.Idorden,
                    Tipo = "EXAMEN"
                })
                .ToListAsync();

            return Ok(examenes);
        }

        [HttpGet("parametros-por-tipoexamen/{idTipoExamen}")]
        public async Task<IActionResult> ObtenerParametrosPorTipoExamen(int idTipoExamen)
        {
            try
            {
                var tipoExamenExiste = await _context.TipoExamen
                    .AnyAsync(te => te.IdtipoExamen == idTipoExamen);
                
                if (!tipoExamenExiste)
                {
                    return NotFound($"No se encontró el tipo de examen con ID {idTipoExamen}");
                }

                var parametros = await _context.Parametros
                    .Where(p => p.IdtipoExamen == idTipoExamen)
                    .Select(p => new
                    {
                        p.Idparametro,
                        Nombre = p.NombreParametro,
                        p.Precio,
                        Tipo = "PARAMETRO",
                        IdTipoExamen = p.IdtipoExamen
                    })
                    .ToListAsync();

                return Ok(parametros);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
            }
        }
    }
}