/* Mapa de navegação entre módulos.
 * Usado pelos módulos antigos do Designer que chamavam onNavigate("id"). */

const HREFS = {
  home:      "/mazzel-preview",
  mapa:      "/mazzel-preview/mapa",
  radar:     "/mazzel-preview/radar",
  dossie:    "/mazzel-preview/dossies",
  estudo:    "/mazzel-preview/estudo",
  delegados: "/mazzel-preview/delegados",
  filiados:  "/mazzel-preview/filiados",
  ia:        "/mazzel-preview/ia",
  alertas:   "/mazzel-preview/alertas",
  portal:    "/mazzel-preview/portal",
  admin:     "/mazzel-preview/admin",
};

export function hrefOf(moduleId) {
  return HREFS[moduleId] || "/mazzel-preview";
}

export function makeNavigate(router) {
  return (moduleId) => router.push(hrefOf(moduleId));
}
