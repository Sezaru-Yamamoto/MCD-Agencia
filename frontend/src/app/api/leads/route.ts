import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const payloadStr = formData.get('payload');

    if (!payloadStr || typeof payloadStr !== 'string') {
      return NextResponse.json(
        { error: 'Missing payload' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(payloadStr);

    // Check honeypot
    if (payload.website) {
      // Silently reject spam
      return NextResponse.json({ success: true, request_number: 'SPAM-DETECTED' });
    }

    // Transform landing page payload to quote request format
    const quoteRequestData: Record<string, unknown> = {
      customer_name: payload.contacto.nombre,
      customer_email: payload.contacto.email,
      customer_phone: payload.contacto.telefono,
      customer_company: payload.contacto.empresa,
      service_type: payload.servicio,
      service_details: payload.detalles,
      description: payload.comentarios || `Servicio: ${payload.servicio}`,
      required_date: payload.fecha_requerida,
      // Map service-specific fields
      dimensions: payload.detalles?.medidas,
      material: payload.detalles?.material,
      includes_installation: payload.detalles?.instalacion_incluida,
    };

    // Map delivery method fields
    if (payload.metodo_entrega) {
      quoteRequestData.delivery_method = payload.metodo_entrega;
    }
    if (payload.entrega) {
      if (payload.entrega.direccion) {
        quoteRequestData.delivery_address = payload.entrega.direccion;
      }
      if (payload.entrega.sucursal) {
        quoteRequestData.pickup_branch = payload.entrega.sucursal;
      }
    }

    // Map multi-service data (servicios array from landing form)
    if (payload.servicios && Array.isArray(payload.servicios) && payload.servicios.length > 0) {
      quoteRequestData.services = JSON.stringify(payload.servicios);
    }

    // Create FormData for backend
    const backendFormData = new FormData();

    // Add all quote request fields
    Object.entries(quoteRequestData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object') {
          backendFormData.append(key, JSON.stringify(value));
        } else {
          backendFormData.append(key, String(value));
        }
      }
    });

    // Forward files to backend
    const fileKeys = Array.from(formData.keys()).filter(key => key.startsWith('archivo_'));
    for (const key of fileKeys) {
      const file = formData.get(key);
      if (file instanceof File) {
        backendFormData.append('attachments', file);
      }
    }

    // Forward file-to-service mapping if present
    const fileServiceMap = formData.get('file_service_map');
    if (fileServiceMap && typeof fileServiceMap === 'string') {
      backendFormData.append('file_service_map', fileServiceMap);
    }

    // Send to Django backend
    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/quotes/request/`, {
        method: 'POST',
        body: backendFormData,
      });
    } catch (fetchError) {
      console.error('Backend connection error:', fetchError);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.' },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      let errorData: Record<string, unknown> = {};
      try {
        errorData = JSON.parse(responseText);
      } catch {
        console.error('Backend non-JSON error:', response.status, responseText.substring(0, 500));
        return NextResponse.json(
          { error: `Error del servidor (${response.status}). Inténtalo de nuevo más tarde.` },
          { status: response.status }
        );
      }
      console.error('Backend error:', response.status, errorData);

      // DRF validation errors come as { field: [errors] } or { detail: "..." }
      let errorMessage = 'Error al procesar la solicitud';
      if (errorData.detail) {
        errorMessage = String(errorData.detail);
      } else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
        // Flatten DRF field errors into readable message
        const fieldErrors = Object.entries(errorData)
          .map(([field, msgs]) => {
            const messages = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
            return `${field}: ${messages}`;
          })
          .join('; ');
        errorMessage = fieldErrors;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      request_number: result.request_number,
      message: result.message,
    });

  } catch (error) {
    console.error('API leads error:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { error: `Error interno: ${message}` },
      { status: 500 }
    );
  }
}
