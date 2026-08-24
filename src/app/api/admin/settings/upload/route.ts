import { NextRequest, NextResponse } from 'next/server';
import { parseAdminSessionToken } from '@/lib/admin-auth';
import { settingsService } from '@/lib/settings-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const user = parseAdminSessionToken(token);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'logo';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (type !== 'logo' && type !== 'favicon') {
      return NextResponse.json({ success: false, error: 'Invalid branding type' }, { status: 400 });
    }

    // Size limit: 5MB for logo/favicon
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Image file size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicUrl = await settingsService.saveBrandingFile(buffer, file.name, type);

    // Automatically update the setting in DB
    const updatePayload = type === 'logo' ? { logoUrl: publicUrl } : { faviconUrl: publicUrl };
    const updatedSettings = await settingsService.updateSettings(updatePayload);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type,
      settings: updatedSettings,
      message: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
