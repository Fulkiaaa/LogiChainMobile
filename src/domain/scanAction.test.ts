import {resolveScanAction, type ScanMode} from '@/domain/scanAction';
import {ITEM_STATUSES, type ItemStatus} from '@/types/api';

/**
 * LA MATRICE COMPLÈTE — 6 statuts × 3 modes = 18 cas.
 *
 * `true` = le scan est accepté et part dans l'outbox.
 * `false` = refusé sur place, aucune requête n'est émise.
 *
 * Elle découle de `ALLOWED_TRANSITIONS` (itemStateMachine) :
 *   Déploiement vise `deployed`  → seul `in_transit` y mène
 *   Transit     vise `in_transit`→ `allocated` et `deployed` y mènent
 *   Pointage    ne change rien   → toujours accepté
 */
const ATTENDU: Record<ItemStatus, Record<ScanMode, boolean>> = {
  in_stock:       {pointage: true, transit: false, deploy: false},
  allocated:      {pointage: true, transit: true,  deploy: false},
  in_transit:     {pointage: true, transit: false, deploy: true},
  deployed:       {pointage: true, transit: true,  deploy: false},
  in_maintenance: {pointage: true, transit: false, deploy: false},
  lost:           {pointage: true, transit: false, deploy: false},
};

const MODES: ScanMode[] = ['pointage', 'transit', 'deploy'];

describe('resolveScanAction — matrice statut × mode', () => {
  for (const status of ITEM_STATUSES) {
    for (const mode of MODES) {
      const attendu = ATTENDU[status][mode];
      it(`${status} + ${mode} → ${attendu ? 'accepté' : 'refusé'}`, () => {
        expect(resolveScanAction(mode, status).ok).toBe(attendu);
      });
    }
  }
});

describe('resolveScanAction — ce qui part dans l’outbox', () => {
  it('le pointage ne porte aucun statut cible : il n’altère rien', () => {
    const r = resolveScanAction('pointage', 'deployed');
    expect(r.ok && r.action).toEqual({actionType: 'scan'});
  });

  it('le transit vise in_transit', () => {
    const r = resolveScanAction('transit', 'allocated');
    expect(r.ok && r.action).toEqual({actionType: 'transit', targetStatus: 'in_transit'});
  });

  it('le déploiement vise deployed', () => {
    const r = resolveScanAction('deploy', 'in_transit');
    expect(r.ok && r.action).toEqual({actionType: 'deploy', targetStatus: 'deployed'});
  });
});

describe('resolveScanAction — le motif du refus', () => {
  it('nomme la transition interdite, pas un message générique', () => {
    // Ce texte s'affiche tel quel sous la caméra : il doit dire à l'agent
    // POURQUOI son scan a été refusé, pas seulement qu'il l'a été.
    const r = resolveScanAction('deploy', 'in_stock');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe('in_stock → deployed interdit');
  });

  it('refuse de redéployer un équipement déjà déployé', () => {
    // `deployed → deployed` n'est pas dans ALLOWED_TRANSITIONS : rescanner en
    // mode Déploiement un équipement déjà posé est un geste sans effet.
    expect(resolveScanAction('deploy', 'deployed').ok).toBe(false);
  });

  it('refuse toute transition depuis un équipement perdu', () => {
    // `lost` est un état terminal côté machine à états.
    expect(resolveScanAction('transit', 'lost').ok).toBe(false);
    expect(resolveScanAction('deploy', 'lost').ok).toBe(false);
  });

  it('accepte quand même le pointage d’un équipement perdu', () => {
    // Volontaire : pointer un équipement déclaré perdu qu'on vient de
    // retrouver doit laisser une trace dans l'historique.
    expect(resolveScanAction('pointage', 'lost').ok).toBe(true);
  });
});
