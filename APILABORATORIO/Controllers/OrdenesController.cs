using APILABORATORIO.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static QuestPDF.Helpers.Colors;

namespace APILABORATORIO.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OrdenesController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public OrdenesController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // Endpoint para obtener todas las órdenes con sus detalles
        [HttpGet("ordenes-con-detalles")]
        public async Task<IActionResult> GetOrdenesConDetalles()
        {
            var ordenes = await _context.Ordens
                .Include(o => o.DetalleOrdens)
                    .ThenInclude(d => d.IdtipoExamenNavigation)
                .Include(o => o.DetalleOrdens)
                    .ThenInclude(d => d.IdmuestraNavigation)
                .Select(o => new
                {
                    IdOrden = o.Idorden,
                    FechaOrden = o.FechaOrden,
                    fechaEntrega = o.FechaEntrega,
                    Estado = o.Estado,
                    ClienteId = o.IdclienteNavigation.Nombre,
                    MedicoId = o.IdmedicoNavigation.Nombre,
                    Detalles = o.DetalleOrdens.Select(d => new
                    {
                        IdDetalle = d.IddetalleOrden,
                        TipoExamen = d.IdtipoExamenNavigation.NombreExamen,
                        Muestra = d.IdmuestraNavigation.Muestra1
                    })
                })
                .ToListAsync();

            return Ok(ordenes);
        }

        // Endpoint para eliminar un detalle de orden
        [HttpDelete("eliminar-detalle/{idDetalle}")]
        public async Task<IActionResult> EliminarDetalleOrden(int idDetalle)
        {
            try
            {
                var detalle = await _context.DetalleOrdens.FindAsync(idDetalle);
                if (detalle == null)
                {
                    return NotFound($"No se encontró el detalle con ID {idDetalle}");
                }

                // Verificar si la orden está anulada
                var orden = await _context.Ordens.FindAsync(detalle.Idorden);
                if (orden?.Estado == "ORDEN-ANULADA")
                {
                    return BadRequest("No se puede modificar una orden anulada");
                }

                _context.DetalleOrdens.Remove(detalle);
                await _context.SaveChangesAsync();

                return Ok(new { Mensaje = $"Detalle {idDetalle} eliminado correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // Endpoint para anular una orden (mantenemos el anterior)
        [HttpPut("anular-orden/{idOrden}")]
        public async Task<IActionResult> AnularOrden(int idOrden)
        {
            try
            {
                var orden = await _context.Ordens
                    .Include(o => o.DetalleOrdens)
                    .FirstOrDefaultAsync(o => o.Idorden == idOrden);

                if (orden == null)
                {
                    return NotFound($"No se encontró la orden con ID {idOrden}");
                }

                if (orden.Estado == "ORDEN-ANULADA")
                {
                    return BadRequest("La orden ya está anulada");
                }

                orden.Estado = "ORDEN-ANULADA";
                _context.Ordens.Update(orden);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Mensaje = $"Orden {idOrden} anulada correctamente",
                    Orden = new
                    {
                        IdOrden = orden.Idorden,
                        Estado = orden.Estado,
                        FechaOrden = orden.FechaOrden,
                      
                        Detalles = orden.DetalleOrdens.Count
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // Endpoint para obtener detalles de una orden específica
        [HttpGet("detalles-orden/{idOrden}")]
        public async Task<IActionResult> GetDetallesOrden(int idOrden)
        {
            var orden = await _context.Ordens
                .Include(o => o.DetalleOrdens)
                    .ThenInclude(d => d.IdtipoExamenNavigation)
                .Include(o => o.DetalleOrdens)
                    .ThenInclude(d => d.IdmuestraNavigation)
                .Where(o => o.Idorden == idOrden)
                .Select(o => new
                {
                    IdOrden = o.Idorden,
                    Estado = o.Estado,
                    Detalles = o.DetalleOrdens.Select(d => new
                    {
                        IdDetalle = d.IddetalleOrden,
                        TipoExamen = d.IdtipoExamenNavigation.NombreExamen,
                        Muestra = d.IdmuestraNavigation.Muestra1,
                    })
                })
                .FirstOrDefaultAsync();

            if (orden == null)
            {
                return NotFound($"No se encontró la orden con ID {idOrden}");
            }

            return Ok(orden);
        }
        public class DetalleOrdenDTO
        {
            public int IdtipoExamen { get; set; }
            public int Idmuestra { get; set; }
        }

        // Ejemplo en C# (ASP.NET Core)
        [HttpPost("agregar-detalle/{idOrden}")]
        public async Task<IActionResult> AgregarDetalle(int idOrden, [FromBody] DetalleOrdenDTO dto)
        {
            var orden = await _context.Ordens.FindAsync(idOrden);
            if (orden == null) return NotFound("Orden no encontrada");
            if (orden.Estado == "ORDEN-ANULADA")
                return BadRequest("No se puede agregar exámenes a una orden anulada");

            var nuevoDetalle = new DetalleOrden
            {
                Idorden = idOrden,
                IdtipoExamen = dto.IdtipoExamen,
                Idmuestra = dto.Idmuestra,
            };

            _context.DetalleOrdens.Add(nuevoDetalle);
            await _context.SaveChangesAsync();

            return Ok(new { Mensaje = "Examen agregado correctamente", Detalle = nuevoDetalle });
        }

    }
}