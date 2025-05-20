using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ResultadoController : Controller
    {
        private readonly LaboratorioClinicoContext _context;
        public ResultadoController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        [HttpGet("ClientesPendientes")]
        public async Task<ActionResult<IEnumerable<ClientePendienteResponse>>> GetClientesConOrdenesPendientes()
        {
            var clientesPendientes = await _context.Ordens
                .Include(o => o.IdclienteNavigation)
                .Include(o => o.DetalleOrdens)
                    .ThenInclude(d => d.IdtipoExamenNavigation)
                    .ThenInclude(t => t.Parametros)
                .Include(o => o.DetalleOrdens)
                    .ThenInclude(d => d.ResultadoExamen)
                .Where(o => o.Estado == "FACTURADO" && // Solo órdenes facturadas
                           o.DetalleOrdens.Any(d =>
                               d.IdtipoExamenNavigation.Parametros.Any(p =>
                                   !d.ResultadoExamen.Any(r => r.Idparametro == p.Idparametro))))
                .GroupBy(o => o.IdclienteNavigation)
                .Select(g => new ClientePendienteResponse
                {
                    IdCliente = g.Key.Idcliente,
                    NombreCliente = g.Key.Nombre,
                    OrdenesPendientes = g.Select(o => new OrdenPendienteResponse
                    {
                        IdOrden = o.Idorden,
                        FechaOrden = (DateTime)o.FechaOrden,
                        fechaEntrega = (DateTime)o.FechaEntrega,
                        ExamenesPendientes = o.DetalleOrdens
                            .Where(d => d.IdtipoExamenNavigation.Parametros.Any(p =>
                                !d.ResultadoExamen.Any(r => r.Idparametro == p.Idparametro)))
                            .Select(d => d.IdtipoExamenNavigation.NombreExamen)
                            .Distinct()
                            .ToList()
                    }).ToList()
                })
                .ToListAsync();

            // Siempre devolver OK, incluso si la lista está vacía
            return Ok(clientesPendientes);
        }

        [HttpGet("{nombreCliente}")]
        public async Task<ActionResult<IEnumerable<object>>> GetParametrosPorCliente(string nombreCliente)
        {
            // Buscar la orden más reciente del cliente con exámenes pendientes
            var orden = await _context.Ordens
                .Include(o => o.IdclienteNavigation)
                .Include(o => o.DetalleOrdens)
                    .ThenInclude(d => d.IdtipoExamenNavigation)
                    .ThenInclude(t => t.Parametros)
                .Include(o => o.DetalleOrdens)
                    .ThenInclude(d => d.ResultadoExamen)
                .Where(o => o.IdclienteNavigation.Nombre.Contains(nombreCliente) &&
                           o.DetalleOrdens.Any(d =>
                               d.IdtipoExamenNavigation.Parametros.Any(p =>
                                   !d.ResultadoExamen.Any(r => r.Idparametro == p.Idparametro))))
                .OrderByDescending(o => o.FechaOrden)
                .FirstOrDefaultAsync();

            if (orden == null)
            {
                return NotFound("No se encontró ninguna orden pendiente para el cliente especificado.");
            }

            // Obtener solo los parámetros que no tienen resultados
            var parametrosPendientes = await _context.DetalleOrdens
                .Where(d => d.Idorden == orden.Idorden)
                .Include(d => d.IdtipoExamenNavigation)
                .ThenInclude(t => t.Parametros)
                .SelectMany(d => d.IdtipoExamenNavigation.Parametros)
                .Where(p => !_context.ResultadoExamen.Any(r =>
                    r.IddetalleOrden == _context.DetalleOrdens
                        .FirstOrDefault(d => d.Idorden == orden.Idorden &&
                                           d.IdtipoExamen == p.IdtipoExamen).IddetalleOrden &&
                    r.Idparametro == p.Idparametro))
                .Select(p => new
                {
                    IDDetalleOrden = _context.DetalleOrdens
                        .FirstOrDefault(d => d.Idorden == orden.Idorden &&
                                           d.IdtipoExamen == p.IdtipoExamen).IddetalleOrden,
                    IDParametro = p.Idparametro,
                    NombreExamen = p.IdtipoExamenNavigation.NombreExamen,
                    NombreParametro = p.NombreParametro,
                    UnidadMedida = p.UnidadMedida,
                    ValorReferencia = p.ValorReferencia,
                    OpcionesFijas = p.OpcionesFijas // Añade este campo
                })
                .ToListAsync();

            if (!parametrosPendientes.Any())
            {
                return NotFound("No se encontraron parámetros pendientes para los exámenes de esta orden.");
            }

            return Ok(new
            {
                IDOrden = orden.Idorden,
                NombreCliente = orden.IdclienteNavigation.Nombre,
                FechaOrden = orden.FechaOrden,
                FechaEntrega = orden.FechaEntrega,
                Parametros = parametrosPendientes
            });
        }

        [HttpPost]
        public async Task<ActionResult<ResultadoExaman>> PostResultados(List<ResultadoRequest> resultadosRequest)
        {
            if (!resultadosRequest.Any())
            {
                return BadRequest("No se proporcionaron resultados para guardar.");
            }

            var resultados = new List<ResultadoExaman>();
            var idOrden = 0;

            foreach (var request in resultadosRequest)
            {
                // Verificar que existe el detalle de orden y el parámetro
                var detalleOrden = await _context.DetalleOrdens
                    .Include(d => d.IdordenNavigation)
                    .FirstOrDefaultAsync(d => d.IddetalleOrden == request.IDDetalleOrden);

                if (detalleOrden == null)
                {
                    return BadRequest($"No se encontró el detalle de orden con ID {request.IDDetalleOrden}");
                }

                idOrden = detalleOrden.IdordenNavigation.Idorden;

                var parametro = await _context.Parametros.FindAsync(request.IDParametro);
                if (parametro == null)
                {
                    return BadRequest($"No se encontró el parámetro con ID {request.IDParametro}");
                }

                // Verificar si ya existe un resultado para este parámetro
                var resultadoExistente = await _context.ResultadoExamen
                    .FirstOrDefaultAsync(r => r.IddetalleOrden == request.IDDetalleOrden && 
                                            r.Idparametro == request.IDParametro);

                if (resultadoExistente != null)
                {
                    resultadoExistente.Resultado = request.Resultado;
                    resultadoExistente.FechaResultado = DateTime.Now;
                    _context.Entry(resultadoExistente).State = EntityState.Modified;
                    resultados.Add(resultadoExistente);
                }
                else
                {
                    // Crear el resultado
                    var resultado = new ResultadoExaman
                    {
                        IddetalleOrden = request.IDDetalleOrden,
                        Idparametro = request.IDParametro,
                        NombreParametro = parametro.NombreParametro,
                        Resultado = request.Resultado,
                        FechaResultado = DateTime.Now
                    };

                    _context.ResultadoExamen.Add(resultado);
                    resultados.Add(resultado);
                }
            }

            await _context.SaveChangesAsync();
            await ActualizarEstadoOrden(idOrden);

            return CreatedAtAction(nameof(GetResultadosPorOrden), new { idOrden = idOrden }, resultados);
        }

        private async Task ActualizarEstadoOrden(int idOrden)
        {
            var orden = await _context.Ordens
                .Include(o => o.DetalleOrdens)
                .ThenInclude(d => d.IdtipoExamenNavigation)
                .ThenInclude(t => t.Parametros)
                .Include(o => o.DetalleOrdens)
                .ThenInclude(d => d.ResultadoExamen)
                .FirstOrDefaultAsync(o => o.Idorden == idOrden);

            if (orden != null)
            {
                // Verificar si todos los parámetros de todos los exámenes tienen resultados
                bool todosCompletos = orden.DetalleOrdens.All(d =>
                    d.IdtipoExamenNavigation.Parametros.All(p =>
                        d.ResultadoExamen.Any(r => r.Idparametro == p.Idparametro)));

                if (todosCompletos)
                {
                    orden.Estado = "COMPLETADO";
                    orden.FechaOrden = DateTime.Now;
                   
                    _context.Entry(orden).State = EntityState.Modified;
                    await _context.SaveChangesAsync();
                }
            }
        }

        [HttpGet("orden/{idOrden}")]
        public async Task<ActionResult<IEnumerable<ResultadoExaman>>> GetResultadosPorOrden(int idOrden)
        {
            var resultados = await _context.ResultadoExamen
                .Where(r => r.IddetalleOrdenNavigation.Idorden == idOrden)
                .Include(r => r.IddetalleOrdenNavigation)
                .ThenInclude(d => d.IdtipoExamenNavigation)
                .Include(r => r.IdparametroNavigation)
                .ToListAsync();

            if (!resultados.Any())
            {
                return NotFound("No se encontraron resultados para esta orden.");
            }

            return resultados;
        }
    }

    public class ResultadoRequest
    {
        public int IDDetalleOrden { get; set; }
        public int IDParametro { get; set; }
        public string Resultado { get; set; }
        public string NombreParametro { get; set; }
    }

    public class ClientePendienteResponse
    {
        public int IdCliente { get; set; }
        public string NombreCliente { get; set; }
        public List<OrdenPendienteResponse> OrdenesPendientes { get; set; }
    }

    public class OrdenPendienteResponse
    {
        public int IdOrden { get; set; }
        public DateTime FechaOrden { get; set; }
        public DateTime fechaEntrega { get; set; }
        public List<string> ExamenesPendientes { get; set; }
    }

    public class OrdenConParametrosResponse
    {
        public int IDOrden { get; set; }
        public string NombreCliente { get; set; }
        public DateTime FechaOrden { get; set; }
        public DateTime fechaEntrega { get; set; }
        public List<ParametroResponse> Parametros { get; set; }
    }

    public class ParametroResponse
    {
        public int IDDetalleOrden { get; set; }
        public int IDParametro { get; set; }
        public string NombreExamen { get; set; }
        public string NombreParametro { get; set; }
        public string UnidadMedida { get; set; }
        public string ValorReferencia { get; set; }
    }
}