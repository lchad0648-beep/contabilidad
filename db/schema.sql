-- Esquema de base de datos (PostgreSQL / Supabase) para el sistema de contabilidad.

CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proveedores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('admin', 'profesional', 'cliente')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  cliente_id BIGINT REFERENCES clientes(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS prestamos (
  id BIGSERIAL PRIMARY KEY,
  cliente_user_id BIGINT NOT NULL REFERENCES users(id),
  monto_solicitado DOUBLE PRECISION NOT NULL,
  motivo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobado', 'Rechazado', 'Pagado')),
  plazo_valor INTEGER,
  plazo_unidad TEXT CHECK (plazo_unidad IN ('dias', 'semanas', 'meses')),
  tipo_pago TEXT CHECK (tipo_pago IN ('unico', 'cuotas')),
  num_cuotas INTEGER,
  tasa_interes DOUBLE PRECISION,
  monto_a_devolver DOUBLE PRECISION,
  fecha_aprobacion TIMESTAMP,
  fecha_vencimiento DATE,
  aprobado_por BIGINT REFERENCES users(id),
  asignado_a BIGINT REFERENCES users(id),
  ticket_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prestamo_cuotas (
  id BIGSERIAL PRIMARY KEY,
  prestamo_id BIGINT NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto DOUBLE PRECISION NOT NULL,
  pagada INTEGER NOT NULL DEFAULT 0,
  fecha_pago DATE
);

CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  cliente_user_id BIGINT NOT NULL REFERENCES users(id),
  asunto TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Abierto' CHECK (estado IN ('Abierto', 'En progreso', 'Cerrado')),
  asignado_a BIGINT REFERENCES users(id),
  tipo TEXT NOT NULL DEFAULT 'soporte' CHECK (tipo IN ('soporte', 'prestamo')),
  prestamo_id BIGINT REFERENCES prestamos(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_mensajes (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recibos (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT,
  cliente_id BIGINT REFERENCES clientes(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Enviado', 'Pagado', 'Vencido')),
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS pagos_numero_seq;

CREATE TABLE IF NOT EXISTS pagos (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT DEFAULT ('PAG-' || lpad(nextval('pagos_numero_seq')::text, 6, '0')),
  cliente_id BIGINT REFERENCES clientes(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  metodo TEXT NOT NULL DEFAULT 'Transferencia' CHECK (metodo IN ('Efectivo', 'Transferencia', 'Tarjeta', 'Cheque')),
  referencia TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notas_credito (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT,
  cliente_id BIGINT REFERENCES clientes(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  motivo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cargos_pago_atrasado (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT REFERENCES clientes(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  descripcion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notas_entrega (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT,
  cliente_id BIGINT REFERENCES clientes(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Entregado', 'Cancelado')),
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tiempo_facturable (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT REFERENCES clientes(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  horas DOUBLE PRECISION NOT NULL DEFAULT 0,
  tarifa DOUBLE PRECISION NOT NULL DEFAULT 0,
  descripcion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recibos_retencion_impuestos (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT,
  cliente_id BIGINT REFERENCES clientes(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  porcentaje DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cotizaciones_compras (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT,
  proveedor_id BIGINT REFERENCES proveedores(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada')),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notas_debito (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT,
  proveedor_id BIGINT REFERENCES proveedores(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  motivo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recepcion_bienes (
  id BIGSERIAL PRIMARY KEY,
  numero TEXT,
  proveedor_id BIGINT REFERENCES proveedores(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Recibido', 'Cancelado')),
  notas TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transferencias_inventario (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  origen TEXT,
  destino TEXT,
  articulo TEXT,
  cantidad DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inversiones (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  tipo TEXT,
  rendimiento DOUBLE PRECISION,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activos_intangibles (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha_adquisicion DATE NOT NULL DEFAULT CURRENT_DATE,
  valor DOUBLE PRECISION NOT NULL DEFAULT 0,
  amortizacion_anual DOUBLE PRECISION,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cuentas_capital (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  tipo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cuentas_especiales (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto DOUBLE PRECISION NOT NULL DEFAULT 0,
  descripcion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asientos_diario (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cuenta TEXT NOT NULL,
  debe DOUBLE PRECISION NOT NULL DEFAULT 0,
  haber DOUBLE PRECISION NOT NULL DEFAULT 0,
  descripcion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Los profesionales no pueden eliminar registros directamente: deben solicitar
-- el borrado y un admin lo aprueba o rechaza.
CREATE TABLE IF NOT EXISTS solicitudes_borrado (
  id BIGSERIAL PRIMARY KEY,
  modulo TEXT NOT NULL,
  registro_id BIGINT NOT NULL,
  registro_descripcion TEXT,
  solicitado_por BIGINT NOT NULL REFERENCES users(id),
  motivo TEXT,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada')),
  revisado_por BIGINT REFERENCES users(id),
  revisado_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ==========================================================================
-- Empresas: registro/empleo/logística/bolsa de valores.
-- ==========================================================================

-- Los usuarios de la app (staff y clientes) tienen su propia billetera para
-- cobrar salario y comprar/vender acciones en la bolsa.
ALTER TABLE users ADD COLUMN IF NOT EXISTS saldo DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Las empresas son una entidad de autenticación separada de "users": se
-- registran con nombre + usuario + contraseña propios, no son ni admin, ni
-- profesional, ni cliente.
CREATE TABLE IF NOT EXISTS empresas (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  saldo DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS empresa_sessions (
  token TEXT PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL
);

-- Resumen: movimientos de dinero de la empresa (ingresos/egresos manuales,
-- pago de salarios, comisión del banco al salir a bolsa, compras/ventas de
-- acciones, etc.)
CREATE TABLE IF NOT EXISTS empresa_transferencias (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto DOUBLE PRECISION NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Logística: materiales/objetos que tiene la empresa. El precio se guarda tal
-- cual se ingresó (por unidad, por stack de 64 o por stack de tamaño
-- personalizado) junto con el tamaño del stack usado, para poder mostrar el
-- precio unitario y el total sin perder cómo lo cargó la empresa.
CREATE TABLE IF NOT EXISTS empresa_materiales (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cantidad DOUBLE PRECISION NOT NULL DEFAULT 0,
  tipo_precio TEXT NOT NULL DEFAULT 'unidad' CHECK (tipo_precio IN ('unidad', 'stack64', 'stack_custom')),
  stack_size INTEGER NOT NULL DEFAULT 1,
  precio_por_stack DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Empleados: relación empresa-usuario. Mientras un usuario no tenga fila con
-- estado 'activo' aquí, su pestaña "Trabajo" permanece bloqueada.
CREATE TABLE IF NOT EXISTS empresa_empleados (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  salario DOUBLE PRECISION NOT NULL DEFAULT 0,
  gasto_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  anotaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'despedido')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  despedido_at TIMESTAMP
);

-- Un usuario solo puede tener un empleo activo a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS empresa_empleados_user_activo
  ON empresa_empleados (user_id)
  WHERE estado = 'activo';

CREATE TABLE IF NOT EXISTS empresa_empleado_mensajes (
  id BIGSERIAL PRIMARY KEY,
  empleado_id BIGINT NOT NULL REFERENCES empresa_empleados(id) ON DELETE CASCADE,
  autor TEXT NOT NULL CHECK (autor IN ('empresa', 'empleado')),
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Bolsa: ticket de solicitud de salida a bolsa. Si se rechaza, se bloquea la
-- pestaña (candado rojo) hasta "bloqueada_hasta". Si se aprueba, el admin fija
-- comisión% y total de acciones; luego la empresa fija qué % sale a mercado y
-- se lanza (fila en empresa_acciones).
CREATE TABLE IF NOT EXISTS empresa_bolsa_solicitudes (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada')),
  mensaje_inicial TEXT,
  revisado_por BIGINT REFERENCES users(id),
  revisado_at TIMESTAMP,
  bloqueada_hasta TIMESTAMP,
  comision_pct DOUBLE PRECISION,
  total_acciones BIGINT,
  valor_empresa DOUBLE PRECISION,
  pct_salida DOUBLE PRECISION,
  lanzada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS empresa_bolsa_mensajes (
  id BIGSERIAL PRIMARY KEY,
  solicitud_id BIGINT NOT NULL REFERENCES empresa_bolsa_solicitudes(id) ON DELETE CASCADE,
  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('empresa', 'staff')),
  autor_nombre TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Estado de mercado ya lanzado para una empresa (una fila por empresa, se crea
-- al confirmar la salida a bolsa).
CREATE TABLE IF NOT EXISTS empresa_acciones (
  empresa_id BIGINT PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  solicitud_id BIGINT NOT NULL REFERENCES empresa_bolsa_solicitudes(id),
  total_acciones BIGINT NOT NULL,
  acciones_banco BIGINT NOT NULL,
  acciones_mercado_totales BIGINT NOT NULL,
  acciones_disponibles BIGINT NOT NULL,
  precio_salida DOUBLE PRECISION NOT NULL,
  precio_actual DOUBLE PRECISION NOT NULL,
  ultimo_tick_at TIMESTAMP NOT NULL DEFAULT now(),
  lanzada_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acciones_tenencias (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  cantidad BIGINT NOT NULL DEFAULT 0,
  UNIQUE (empresa_id, user_id)
);

CREATE TABLE IF NOT EXISTS acciones_transacciones (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venta')),
  cantidad BIGINT NOT NULL,
  precio DOUBLE PRECISION NOT NULL,
  total DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS acciones_precio_historial (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  precio DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS acciones_precio_historial_empresa_fecha
  ON acciones_precio_historial (empresa_id, created_at);
