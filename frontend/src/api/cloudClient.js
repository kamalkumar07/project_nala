const BASE_URL =
  import.meta.env.VITE_CLOUD_API_BASE_URL ||
  'https://wlsar6ezkg.execute-api.ap-south-1.amazonaws.com/dev';

async function cloudRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: options.body
        ? { 'Content-Type': 'application/json' }
        : {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    console.error('[PARVAT cloud API] Network request failed:', {
      path,
      message: error.message,
    });

    throw new Error(`Cloud API connection failed at ${path}.`);
  }

  const data =
    response.status === 204
      ? null
      : await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('[PARVAT cloud API] HTTP error:', {
      path,
      status: response.status,
      error: data?.error,
      message: data?.message,
    });

    throw new Error(
      `${path} failed (HTTP ${response.status}): ${
        data?.message || data?.error || 'Unknown API error'
      }`,
    );
  }

  return data;
}

export async function submitCloudReport({
  file,
  lat,
  lng,
  note,
  clientTimestamp,
}) {
  console.info('[PARVAT upload] Stage 1: Requesting presigned URL', {
    fileType: file?.type,
    fileSize: file?.size,
  });

  const presign = await cloudRequest('/cloud/uploads/presign', {
    method: 'POST',
    body: {
      file_name: file.name || 'flood-photo.jpg',
      content_type: file.type || 'image/jpeg',
    },
  });

  const uploadUrl = presign.upload_url;
  const photoKey = presign.object_key;

  if (!uploadUrl || !photoKey) {
    throw new Error('Presign API did not return an upload URL and object key.');
  }

  console.info('[PARVAT upload] Stage 1 succeeded', {
    objectKey: photoKey,
    expiresIn: presign.expires_in,
  });

  console.info('[PARVAT upload] Stage 2: Uploading photo to S3');

  let upload;

  try {
    upload = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;

    console.error('[PARVAT upload] S3 network/CORS failure:', {
      name: error.name,
      message: error.message,
    });

    throw new Error(
      'S3 upload request failed at the network/CORS stage. Check the browser Console.',
    );
  }

  if (!upload.ok) {
    const responseText = await upload.text().catch(() => '');

    console.error('[PARVAT upload] S3 returned an HTTP error:', {
      status: upload.status,
      response: responseText.slice(0, 1000),
    });

    throw new Error(`S3 photo upload failed (HTTP ${upload.status}).`);
  }

  console.info('[PARVAT upload] Stage 2 succeeded');

  console.info('[PARVAT upload] Stage 3: Registering report');

  const report = await cloudRequest('/cloud/reports', {
    method: 'POST',
    body: {
      photoKey,
      lat: Number(lat),
      lng: Number(lng),
      note: note ? note.slice(0, 280) : undefined,
      clientTimestamp,
    },
  });

  console.info('[PARVAT upload] Stage 3 succeeded', {
    reportId: report?.reportId,
  });

  return report;
}

export function getCloudReport(reportId, signal) {
  return cloudRequest(`/cloud/reports/${encodeURIComponent(reportId)}`, {
    signal,
  });
}

export function confirmCloudReport(reportId, reportToken, userDepthClass) {
  return cloudRequest(`/cloud/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    body: {
      userConfirmed: true,
      userDepthClass,
      reportToken,
    },
  });
}
