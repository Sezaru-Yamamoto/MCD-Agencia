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

    // Create FormData for backend
    const backendFormData = new FormData();

    // Add all quote request fields
    Object.entries(quoteRequestData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
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

    // Send to Django backend
    const response = await fetch(`${BACKEND_URL}/quotes/request/`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.detail || 'Error processing request' },
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
