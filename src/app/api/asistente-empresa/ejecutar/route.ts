import { NextRequest, NextResponse } from "next/server";
import { getCurrentEmpresa } from "@/lib/empresa-auth";

const MAX_TEXTO = 4000;
const TIPOS_PRECIO = new Set(["unidad", "stack64", "stack_custom"]);

function texto(valor: unknown, max = MAX_TEXTO): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio.slice(0, max) : null;
}

function numeroPositivo(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function numero(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  const empresa = await getCurrentEmpresa();
  if (!empresa) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tipo = typeof body?.tipo === "string" ? body.tipo : null;
  const payload = body?.payload;
  if (!tipo || typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const p = payload as Record<string, unknown>;

  try {
    if (tipo === "crear_material") {
      const nombre = texto(p.nombre, 100);
      const cantidad = numero(p.cantidad);
      const tipoPrecio = texto(p.tipo_precio, 20);
      const precioPorStack = numero(p.precio_por_stack);
      if (!nombre || cantidad === null || !tipoPrecio || !TIPOS_PRECIO.has(tipoPrecio) || precioPorStack === null) {
        return NextResponse.json({ error: "Faltan datos válidos para el material." }, { status: 400 });
      }
      const stackSize = numeroPositivo(p.stack_size);
      const { crearMaterial } = await import("@/lib/empresa-materiales");
      await crearMaterial(
        empresa.id,
        nombre,
        cantidad,
        tipoPrecio as "unidad" | "stack64" | "stack_custom",
        stackSize,
        precioPorStack
      );
      return NextResponse.json({ ok: true, mensaje: `Listo, añadí "${nombre}" a Logística.`, url: "/empresa/logistica" });
    }

    if (tipo === "contratar_empleado") {
      const usuario = texto(p.usuario, 60);
      const salario = numero(p.salario) ?? 0;
      if (!usuario) return NextResponse.json({ error: "Falta el usuario a contratar." }, { status: 400 });

      const { getUserIdByUsername } = await import("@/lib/asistente-contexto");
      const userId = await getUserIdByUsername(usuario);
      if (!userId) return NextResponse.json({ error: `No encontré ningún usuario "${usuario}".` }, { status: 400 });

      const { contratarUsuario } = await import("@/lib/empresa-empleados");
      const result = await contratarUsuario(empresa.id, userId, salario);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ ok: true, mensaje: `Listo, contraté a ${usuario}.`, url: "/empresa/empleados" });
    }

    // El resto de acciones actúan sobre un empleado existente: lo resolvemos por username.
    if (
      tipo === "actualizar_salario" ||
      tipo === "pagar_salario" ||
      tipo === "despedir_empleado" ||
      tipo === "enviar_mensaje_empleado_empresa"
    ) {
      const username = texto(p.empleado, 60);
      if (!username) return NextResponse.json({ error: "Falta el nombre del empleado." }, { status: 400 });

      const { listEmpleados } = await import("@/lib/empresa-empleados");
      const empleados = await listEmpleados(empresa.id);
      const match = empleados.find(
        (e) => e.estado === "activo" && e.username.toLowerCase() === username.toLowerCase()
      );
      if (!match) {
        return NextResponse.json({ error: `No encontré un empleado activo llamado "${username}".` }, { status: 400 });
      }

      if (tipo === "actualizar_salario") {
        const salario = numero(p.salario);
        if (salario === null) return NextResponse.json({ error: "Falta el nuevo salario." }, { status: 400 });
        const { actualizarEmpleado } = await import("@/lib/empresa-empleados");
        await actualizarEmpleado(empresa.id, match.id, salario, match.anotaciones ?? "");
        return NextResponse.json({
          ok: true,
          mensaje: `Listo, actualicé el salario de ${username} a ${salario}.`,
          url: `/empresa/empleados/${match.id}`,
        });
      }

      if (tipo === "pagar_salario") {
        const { pagarSalario } = await import("@/lib/empresas");
        const result = await pagarSalario(empresa.id, match.id);
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({
          ok: true,
          mensaje: `Listo, pagué el salario de ${username}.`,
          url: `/empresa/empleados/${match.id}`,
        });
      }

      if (tipo === "despedir_empleado") {
        const { despedirEmpleado } = await import("@/lib/empresa-empleados");
        await despedirEmpleado(empresa.id, match.id);
        return NextResponse.json({ ok: true, mensaje: `Listo, despedí a ${username}.`, url: "/empresa/empleados" });
      }

      // enviar_mensaje_empleado_empresa
      const mensaje = texto(p.mensaje);
      if (!mensaje) return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
      const { enviarMensajeEmpleado } = await import("@/lib/empresa-empleados");
      await enviarMensajeEmpleado(match.id, "empresa", mensaje);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, envié el mensaje a ${username}.`,
        url: `/empresa/empleados/${match.id}`,
      });
    }

    if (tipo === "solicitar_bolsa") {
      const mensaje = texto(p.mensaje) ?? "";
      const { crearSolicitudBolsa } = await import("@/lib/bolsa");
      const result = await crearSolicitudBolsa(empresa.id, mensaje);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({
        ok: true,
        mensaje: "Listo, envié la solicitud de salida a bolsa al banco.",
        url: "/empresa/bolsa",
      });
    }

    if (tipo === "lanzar_bolsa") {
      const pctSalida = numeroPositivo(p.pct_salida);
      if (!pctSalida) return NextResponse.json({ error: "Falta el % de salida a bolsa." }, { status: 400 });
      const { getUltimaSolicitud, lanzarBolsa } = await import("@/lib/bolsa");
      const solicitud = await getUltimaSolicitud(empresa.id);
      if (!solicitud) return NextResponse.json({ error: "No hay ninguna solicitud de bolsa aprobada." }, { status: 400 });
      const result = await lanzarBolsa(solicitud.id, empresa.id, pctSalida);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ ok: true, mensaje: "Listo, la empresa ya cotiza en bolsa.", url: "/empresa/bolsa" });
    }

    return NextResponse.json({ error: "Tipo de acción desconocido." }, { status: 400 });
  } catch (err) {
    console.error("Error ejecutando acción del asistente IA (empresa):", err);
    return NextResponse.json({ error: "No se pudo completar la acción." }, { status: 500 });
  }
}
