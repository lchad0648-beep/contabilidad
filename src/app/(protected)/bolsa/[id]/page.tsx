import BolsaEmpresaDetalleView from "@/components/BolsaEmpresaDetalleView";

export default async function BolsaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BolsaEmpresaDetalleView empresaId={Number(id)} />;
}
