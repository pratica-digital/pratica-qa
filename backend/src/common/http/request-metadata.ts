import { RequestMetadata } from '../../audit/audit.service';

type RequestLike = {
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
  headers?: Record<string, string | string[] | undefined>;
};

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getRequestMetadata(request: RequestLike): RequestMetadata {
  const forwardedFor = firstHeader(request.headers?.['x-forwarded-for']);
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || request.ip || request.socket?.remoteAddress || '';

  return {
    ipAddress,
    userAgent: firstHeader(request.headers?.['user-agent']) ?? '',
  };
}
