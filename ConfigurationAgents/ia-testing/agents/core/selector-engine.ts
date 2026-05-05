import { Page, Locator } from '@playwright/test';
import { generateTextVariants } from './healer-agents';

// Risk 1: 'option' eliminado — los <option> de <select> se manejan via selectOption, no getByRole
type RoleType = 'textbox' | 'button' | 'spinbutton' | 'checkbox' | 'link' | 'combobox';

// Palabras clave para detección semántica de roles — ES / EN / PT / FR / DE
const ROLE_KEYWORDS: Record<RoleType, string[]> = {
  // Risk 2: checkbox se evalúa ANTES de button para que "accept/acepto" no colisione
  checkbox: [
    'recordarme', 'remember', 'recuérdame',
    'acepto', 'accept',                          // "I accept the terms" → checkbox
    'términos', 'terms', 'termos',               // PT
    'condiciones', 'conditions', 'condições',    // PT
    'activo', 'active', 'ativo',                 // PT
    'habilitado', 'enabled',
    'zustimmen', 'akzeptieren',                  // DE
    "j'accepte", 'accepter',                     // FR
  ],
  textbox: [
    'usuario', 'user', 'utilizador', 'benutzer', 'utilisateur',
    'email', 'correo', 'e-mail',
    'contraseña', 'password', 'pass', 'pwd', 'senha', 'passwort', 'mot de passe',
    'nombre', 'name', 'nome', 'prénom', 'vorname',
    'apellido', 'last name', 'sobrenome', 'nachname', 'nom',
    'dirección', 'address', 'endereço', 'adresse', 'adresa',
    'teléfono', 'phone', 'telefone', 'telefon', 'téléphone',
    'móvil', 'celular', 'mobile', 'handy',
    'buscar', 'search', 'pesquisar', 'suchen', 'rechercher',
    'comentario', 'comment', 'comentário', 'kommentar', 'commentaire',
    'descripción', 'description', 'descrição', 'beschreibung',
    'texto', 'text', 'tekst',
    'mensaje', 'message', 'mensagem', 'nachricht',
  ],
  button: [
    'ingresar', 'login', 'sign in', 'entrar',
    'confirmar', 'confirm', 'confirmar',
    // Risk 2: 'accept' eliminado de button; queda en checkbox
    'aceptar', 'ok',
    'guardar', 'save', 'salvar', 'speichern', 'enregistrer',
    'enviar', 'send', 'submit', 'enviar', 'senden', 'envoyer',
    'continuar', 'continue', 'continuar', 'weiter', 'continuer',
    'siguiente', 'next', 'próximo', 'weiter', 'suivant',
    'anterior', 'back', 'anterior', 'zurück', 'retour',
    'salir', 'logout', 'cerrar sesión', 'sair', 'déconnexion', 'abmelden',
    'registrar', 'register', 'registrar', 'registrieren', "s'inscrire",
    'crear', 'create', 'criar', 'erstellen', 'créer',
    'agregar', 'add', 'adicionar', 'hinzufügen', 'ajouter',
    'transferir', 'transfer', 'transferir', 'übertragen', 'transférer',
    'pagar', 'pay', 'pagar', 'bezahlen', 'payer',
    'comprar', 'buy', 'comprar', 'kaufen', 'acheter',
    'aplicar', 'apply', 'aplicar', 'anwenden', 'appliquer',
  ],
  spinbutton: [
    'monto', 'valor', 'amount', 'montante', 'betrag', 'montant',
    'precio', 'price', 'preço', 'preis', 'prix',
    'cantidad', 'quantity', 'quantidade', 'menge', 'quantité',
    'total',
    'número', 'number', 'número', 'nummer', 'numéro',
    'edad', 'age', 'idade', 'alter', 'âge',
  ],
  link: [
    'inicio de sesión', 'iniciar sesión', 'log in', 'entrar',
    'bienvenido', 'welcome', 'bem-vindo', 'willkommen', 'bienvenu',
    'olvidé', 'forgot', 'esqueci', 'vergessen', 'oublié',
    'recuperar', 'recover', 'recuperar', 'wiederherstellen', 'récupérer',
    'ver más', 'see more', 'ver mais', 'mehr sehen', 'voir plus',
    'leer más', 'read more', 'ler mais', 'mehr lesen', 'lire plus',
    'aquí', 'here', 'aqui', 'hier', 'ici',
    'haga clic', 'click here',
  ],
  combobox: [
    'selecciona', 'select', 'selecione', 'auswählen', 'sélectionner',
    'elige', 'choose', 'escolha', 'wählen', 'choisir',
    'tipo', 'type', 'tipo', 'typ', 'type',
    'categoría', 'category', 'categoria', 'kategorie', 'catégorie',
    'estado', 'status', 'estado', 'status', 'état',
    'país', 'country', 'país', 'land', 'pays',
    'ciudad', 'city', 'cidade', 'stadt', 'ville',
  ],
};

// Risk 2: checkbox ahora es la primera entrada en ROLE_KEYWORDS — pero el orden
// de evaluación en detectRole sigue la inserción del objeto. Para garantizarlo,
// iteramos en un orden explícito que coloca checkbox ANTES de button.
const DETECTION_ORDER: RoleType[] = ['checkbox', 'textbox', 'button', 'spinbutton', 'combobox', 'link'];

function detectRole(label: string): RoleType | null {
  const lower = label.toLowerCase();
  for (const role of DETECTION_ORDER) {
    if (ROLE_KEYWORDS[role].some(k => lower.includes(k))) {
      return role;
    }
  }
  return null;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class SelectorEngine {

  static build(page: Page, label: string): Locator {
    const role     = detectRole(label);
    const variants = generateTextVariants(label);

    // ── Estrategia base: por rol detectado ──────────────────────────────────
    if (role) {
      let loc = page.getByRole(role as any, { name: label })
        .or(page.getByRole(role as any, { name: new RegExp(escapeRegex(label), 'i') }))
        .or(page.getByLabel(label))
        .or(page.getByPlaceholder(label))
        .or(page.getByText(label, { exact: false }));

      // Risk 3: limitado a 4 variantes → máx ~13 estrategias en el OR chain
      for (const variant of variants.slice(0, 4)) {
        loc = loc
          .or(page.getByRole(role as any, { name: new RegExp(escapeRegex(variant), 'i') }))
          .or(page.getByText(variant, { exact: false }));
      }
      return loc.first();
    }

    // ── Estrategia genérica: todos los roles clickeables ────────────────────
    // Risk 4: reemplazado `nav >> text=` (sintaxis legacy) por locator chaining
    let loc = page.getByRole('button', { name: label })
      .or(page.getByRole('link', { name: label }))
      .or(page.locator('nav').getByText(label))
      .or(page.getByLabel(label))
      .or(page.getByPlaceholder(label))
      .or(page.getByText(label, { exact: false }));

    // Risk 3: limitado a 5 variantes → máx ~21 estrategias en el OR chain
    for (const variant of variants.slice(0, 5)) {
      loc = loc
        .or(page.getByRole('link',   { name: new RegExp(escapeRegex(variant), 'i') }))
        .or(page.getByRole('button', { name: new RegExp(escapeRegex(variant), 'i') }))
        .or(page.getByText(variant, { exact: false }));
    }

    return loc.first();
  }
}
