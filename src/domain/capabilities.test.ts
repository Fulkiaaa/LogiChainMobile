import {
  ALL_CAPABILITIES,
  CAPABILITY_LABELS,
  allowedCapabilities,
  can,
  whyNot,
} from '@/domain/capabilities';
import type {AppCapability} from '@/domain/capabilities';
import type {UserRole} from '@/types/api';

/**
 * Miroir de la matrice d'autorisation RÉELLE de l'API, restreinte aux seules
 * actions que l'application mobile sait déclencher.
 *
 * Relevé le 2026-08-25 par appels HTTP sur les 4 comptes de démo, et verrouillé
 * côté API par `tests/unit/middlewares/permissionMatrix.test.ts` :
 *
 *   POST /items/:id/scan      → aucune garde de rôle
 *   POST /items/:id/transit   → aucune garde de rôle
 *   POST /items/:id/anomaly   → aucune garde de rôle
 *   POST /items/:id/lost      → aucune garde de rôle
 *   POST /items/:id/deploy    → requireRole('admin','logistics_manager','field_agent')
 *   POST /auth/register       → requireRole('admin')
 *
 * L'API reste l'autorité : ce module ne fait que l'anticiper pour ne pas
 * proposer un geste voué à un 403.
 */

describe('can', () => {
  it('ouvre le pointage à tous les rôles', () => {
    expect(can('admin', 'scan')).toBe(true);
    expect(can('logistics_manager', 'scan')).toBe(true);
    expect(can('field_agent', 'scan')).toBe(true);
    expect(can('transporter', 'scan')).toBe(true);
  });

  it('ouvre le transit à tous les rôles, transporteur compris', () => {
    expect(can('transporter', 'transit')).toBe(true);
  });

  it('ouvre le signalement d’anomalie et de perte à tous les rôles', () => {
    // Le transporteur constate une casse pendant l'acheminement : lui fermer ce
    // geste ferait perdre l'information.
    expect(can('transporter', 'anomaly')).toBe(true);
    expect(can('transporter', 'lost')).toBe(true);
  });

  it('refuse le déploiement au transporteur : il achemine, il n’installe pas', () => {
    expect(can('transporter', 'deploy')).toBe(false);
    expect(can('field_agent', 'deploy')).toBe(true);
    expect(can('logistics_manager', 'deploy')).toBe(true);
    expect(can('admin', 'deploy')).toBe(true);
  });

  it('réserve la création de comptes à l’admin', () => {
    expect(can('admin', 'manageUsers')).toBe(true);
    expect(can('logistics_manager', 'manageUsers')).toBe(false);
    expect(can('field_agent', 'manageUsers')).toBe(false);
    expect(can('transporter', 'manageUsers')).toBe(false);
  });

  it('refuse tout quand le rôle est inconnu (utilisateur pas encore chargé)', () => {
    // Fermé par défaut : mieux vaut un geste grisé une seconde de trop qu'un
    // geste proposé puis rejeté par le serveur.
    for (const cap of ALL_CAPABILITIES) {
      expect(can(undefined, cap)).toBe(false);
      expect(can(null, cap)).toBe(false);
    }
  });
});

describe('whyNot', () => {
  it('ne donne aucune raison quand le geste est autorisé', () => {
    expect(whyNot('field_agent', 'deploy')).toBeNull();
  });

  it('explique le refus en nommant le rôle de l’utilisateur et qui a le droit', () => {
    const raison = whyNot('transporter', 'deploy');
    expect(raison).toContain('Transporteur');
    expect(raison).toContain('Agent de terrain');
  });

  it('explique le refus de la gestion des comptes', () => {
    expect(whyNot('field_agent', 'manageUsers')).toContain('Administrateur');
  });

  it('explique l’absence de rôle sans mentir sur la cause', () => {
    expect(whyNot(undefined, 'deploy')).toContain('Rôle inconnu');
  });
});

/**
 * LE PARCOURS PAR RÔLE.
 *
 * Cette table est la réponse exécutable à « qui peut faire quoi dans
 * l'application ». Ouvrir ou fermer un droit sans mettre la table à jour fait
 * échouer le test : la documentation ne peut pas diverger du code.
 */
const PARCOURS: Record<UserRole, readonly AppCapability[]> = {
  admin: ['scan', 'transit', 'deploy', 'anomaly', 'lost', 'maintenance', 'manageUsers'],
  logistics_manager: ['scan', 'transit', 'deploy', 'anomaly', 'lost', 'maintenance'],
  field_agent: ['scan', 'transit', 'deploy', 'anomaly', 'lost', 'maintenance'],
  // Le transporteur reste à l'écart de `deploy` ET de `maintenance`.
  transporter: ['scan', 'transit', 'anomaly', 'lost'],
};

describe('parcours par rôle', () => {
  it.each(Object.keys(PARCOURS) as UserRole[])(
    '%s : la liste des gestes autorisés est exactement celle attendue',
    (role) => {
      expect([...allowedCapabilities(role)].sort()).toEqual([...PARCOURS[role]].sort());
    },
  );

  it('admin est le seul à pouvoir tout faire', () => {
    const complets = (Object.keys(PARCOURS) as UserRole[]).filter(
      (r) => allowedCapabilities(r).length === ALL_CAPABILITIES.length,
    );
    expect(complets).toEqual(['admin']);
  });

  it('transporter et field_agent ne sont pas interchangeables', () => {
    // Le pendant mobile du test de matrice de l'API. Si les deux rôles
    // finissaient par avoir les mêmes droits, la distinction serait cosmétique.
    expect(allowedCapabilities('field_agent')).not.toEqual(allowedCapabilities('transporter'));
  });

  it('aucun rôle ne se voit refuser les gestes de constat terrain', () => {
    for (const role of Object.keys(PARCOURS) as UserRole[]) {
      expect(can(role, 'scan')).toBe(true);
      expect(can(role, 'anomaly')).toBe(true);
      expect(can(role, 'lost')).toBe(true);
    }
  });
});

describe('CAPABILITY_LABELS', () => {
  it('donne un libellé lisible à chaque geste', () => {
    for (const cap of ALL_CAPABILITIES) {
      expect(CAPABILITY_LABELS[cap]).toBeTruthy();
    }
  });
});
