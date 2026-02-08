import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso de Privacidad',
  description: 'Aviso de privacidad y política de cookies de Agencia MCD.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-custom max-w-3xl">
        <article className="prose prose-invert prose-lg mx-auto space-y-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Aviso de Privacidad
          </h1>
          <p className="text-sm text-neutral-400">
            Última actualización: 8 de febrero de 2026
          </p>

          {/* ── Identidad del responsable ────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              1. Identidad del responsable
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              <strong className="text-white">Agencia MCD</strong> (en adelante &quot;nosotros&quot; o &quot;la Empresa&quot;), con
              domicilio en Acapulco, Guerrero, México, es responsable de la recopilación,
              uso y protección de sus datos personales conforme a la Ley Federal de
              Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)
              y demás normativa aplicable.
            </p>
          </section>

          {/* ── Datos que recopilamos ────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              2. Datos personales que recopilamos
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Dependiendo de su interacción con nuestro sitio, podemos recopilar:
            </p>
            <ul className="list-disc pl-6 text-neutral-300 space-y-1">
              <li><strong className="text-white">Datos de identificación:</strong> nombre, correo electrónico, teléfono, empresa.</li>
              <li><strong className="text-white">Datos de cuenta:</strong> contraseña (encriptada), rol de usuario.</li>
              <li><strong className="text-white">Datos de transacción:</strong> productos cotizados, pedidos, historial de compras.</li>
              <li><strong className="text-white">Datos de navegación:</strong> dirección IP, tipo de dispositivo, sistema operativo, navegador, páginas visitadas, tiempo en el sitio, profundidad de scroll.</li>
              <li><strong className="text-white">Datos de marketing:</strong> fuente de tráfico (UTM), interacciones con anuncios.</li>
            </ul>
          </section>

          {/* ── Finalidades ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              3. Finalidades del tratamiento
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Sus datos se utilizarán para:
            </p>
            <ul className="list-disc pl-6 text-neutral-300 space-y-1">
              <li>Procesar cotizaciones y pedidos.</li>
              <li>Crear y administrar su cuenta de usuario.</li>
              <li>Enviar notificaciones sobre el estado de sus solicitudes.</li>
              <li>Mejorar nuestro sitio web mediante análisis de uso (Google Analytics, Microsoft Clarity).</li>
              <li>Mostrar publicidad relevante (Facebook Pixel, Google Ads), solo con su consentimiento.</li>
              <li>Cumplir con obligaciones legales.</li>
            </ul>
          </section>

          {/* ── Cookies ──────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              4. Uso de cookies y tecnologías de rastreo
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Utilizamos los siguientes tipos de cookies:
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-neutral-700">
                <thead>
                  <tr className="bg-neutral-800">
                    <th className="text-left px-4 py-2 text-white font-semibold">Tipo</th>
                    <th className="text-left px-4 py-2 text-white font-semibold">Finalidad</th>
                    <th className="text-left px-4 py-2 text-white font-semibold">¿Requiere consentimiento?</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-300 divide-y divide-neutral-700">
                  <tr>
                    <td className="px-4 py-2 font-medium text-white">Esenciales</td>
                    <td className="px-4 py-2">Sesión, carrito de compras, idioma, seguridad</td>
                    <td className="px-4 py-2">No (necesarias para el funcionamiento)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-white">Analíticas</td>
                    <td className="px-4 py-2">Google Analytics 4, Microsoft Clarity — medir uso del sitio, mapas de calor, grabaciones de sesión</td>
                    <td className="px-4 py-2">Sí</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-white">Marketing</td>
                    <td className="px-4 py-2">Facebook Pixel, Google Ads — remarketing y anuncios personalizados</td>
                    <td className="px-4 py-2">Sí</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-neutral-300 leading-relaxed">
              Al visitar nuestro sitio por primera vez, verá un banner de cookies donde podrá:
              aceptar todas, rechazar las no esenciales, o personalizar su elección. Puede
              cambiar sus preferencias en cualquier momento haciendo clic en &quot;Preferencias de
              cookies&quot; en el pie de página.
            </p>
          </section>

          {/* ── Transferencias ───────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              5. Transferencias a terceros
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Podemos compartir datos con:
            </p>
            <ul className="list-disc pl-6 text-neutral-300 space-y-1">
              <li><strong className="text-white">Google LLC</strong> — Analytics y Ads (EE.UU.).</li>
              <li><strong className="text-white">Microsoft Corporation</strong> — Clarity (EE.UU.).</li>
              <li><strong className="text-white">Meta Platforms</strong> — Facebook Pixel (EE.UU.).</li>
              <li><strong className="text-white">Proveedores de pago</strong> — para procesar transacciones.</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed">
              Estas transferencias se realizan conforme al art. 36 de la LFPDPPP y los términos
              de privacidad de cada proveedor.
            </p>
          </section>

          {/* ── Derechos ARCO ────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              6. Derechos ARCO
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Usted tiene derecho a <strong className="text-white">Acceder</strong>,{' '}
              <strong className="text-white">Rectificar</strong>,{' '}
              <strong className="text-white">Cancelar</strong> u{' '}
              <strong className="text-white">Oponerse</strong> al tratamiento de sus datos
              personales (Derechos ARCO). Para ejercer estos derechos, envíe un correo a{' '}
              <a href="mailto:privacidad@agenciamcd.com" className="text-cmyk-cyan hover:underline">
                privacidad@agenciamcd.com
              </a>{' '}
              indicando su nombre completo, descripción de la solicitud y una copia de su identificación oficial.
              Responderemos en un plazo máximo de 20 días hábiles.
            </p>
          </section>

          {/* ── Seguridad ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              7. Medidas de seguridad
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Implementamos medidas administrativas, técnicas y físicas para proteger sus
              datos, incluyendo: cifrado HTTPS/TLS, contraseñas hasheadas, control de acceso
              basado en roles, y registros de auditoría.
            </p>
          </section>

          {/* ── Cambios ──────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              8. Cambios al aviso de privacidad
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Nos reservamos el derecho de modificar este aviso. Las actualizaciones se
              publicarán en esta página con su nueva fecha de vigencia. Si los cambios son
              significativos, le solicitaremos nuevamente su consentimiento para cookies
              analíticas y de marketing.
            </p>
          </section>

          {/* ── Contacto ─────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-cmyk-cyan">
              9. Contacto
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              Si tiene dudas sobre este aviso de privacidad, contáctenos:
            </p>
            <ul className="list-disc pl-6 text-neutral-300 space-y-1">
              <li>Correo: <a href="mailto:privacidad@agenciamcd.com" className="text-cmyk-cyan hover:underline">privacidad@agenciamcd.com</a></li>
              <li>WhatsApp: <a href="https://wa.me/527441234567" className="text-cmyk-cyan hover:underline">+52 744 123 4567</a></li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
