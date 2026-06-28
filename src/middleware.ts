import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("sb-zrwnpfhmtjeanhanumnb-auth-token");
  if (!authCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const role = request.cookies.get("user_role")?.value;
  const status = request.cookies.get("user_status")?.value;

  if (!role || !status || status === "locked" || status === "inactive") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const rolePrefixes: Record<string, string[]> = {
    admin: ["/admin"],
    librarian: ["/librarian"],
    reader: ["/reader"],
  };

  const allowed = (rolePrefixes[role] || []).some((p) =>
    pathname.startsWith(p)
  );

  if (!allowed && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname =
      role === "admin"
        ? "/admin/librarians"
        : role === "librarian"
        ? "/librarian/readers"
        : "/reader/search";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
