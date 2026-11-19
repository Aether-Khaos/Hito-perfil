import Link from 'next/link';

export default function Inicio() {
  const modulos = [
    { ruta: '/cargar', titulo: 'Cargar datos', desc: 'Sube el Excel del hito o un Google Sheet, y carga los exámenes.' },
    { ruta: '/analisis', titulo: 'Análisis', desc: 'Resumen en tortas, rankings y perfil diagnóstico por estudiante.' },
    { ruta: '/progresion', titulo: 'Progresión', desc: 'Avance de cada estudiante entre los hitos Inicial, Intermedio y Final.' },
    { ruta: '/historial', titulo: 'Historial', desc: 'Consulta los datos guardados por año y nivel.' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#212529]">Perfil Hito</h1>
        <p className="text-sm text-[#6c757d] mt-1">Diagnóstico por hitos del perfil de egreso · UAB Ingeniería de Sistemas</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {modulos.map((m) => (
          <Link key={m.ruta} href={m.ruta} className="bg-white border border-[#ced4da] rounded p-5 hover:border-[#1177d1] transition-colors block">
            <h2 className="font-semibold text-[#212529] text-lg">{m.titulo}</h2>
            <p className="text-sm text-[#6c757d] mt-1">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}