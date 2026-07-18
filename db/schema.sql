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
