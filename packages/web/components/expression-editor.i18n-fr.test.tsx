import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { ExpressionContext } from '@midnite/shared';

import { renderWithIntl } from '@/vitest.render-intl';

import { ExpressionField } from './expression-editor';

/**
 * Phase 82 Theme D (composer slice) — behavioural fr-FR render of the expression field.
 *
 * The headline fix this pins is the **field-name aria residue**: the accessible names
 * used to be a translated `fieldLabel` concatenated into an English template
 * (`` `${fieldLabel} expression` ``), so a French node catalogue still produced
 * "URL expression". They are now whole-sentence ICU messages taking `field` as an
 * argument, which lets French put the noun first ("Expression pour URL") — so these
 * assertions would fail under the old concatenation even with the catalogue in place.
 *
 * Also asserted: the data-picker `title` tooltip and the empty-picker copy, plus the
 * fact that expression syntax itself (`{{ }}`, `$json`) is never translated.
 */

const context: ExpressionContext = {
  $json: { body: { title: 'Corriger le bug de connexion', number: 42 } },
  $node: { 'Fetch issue': { json: { status: 200 } } },
  $env: {},
};

afterEach(cleanup);

describe('Phase 82 D — ExpressionField renders fr-FR', () => {
  it('builds the field-scoped accessible names from ICU, not a translated label in an English frame', () => {
    renderWithIntl(
      <ExpressionField
        value=""
        onChange={() => {}}
        fieldLabel="URL"
        context={context}
        hasData
      />,
      { locale: 'fr-FR' },
    );

    // French word order puts the noun first — impossible with `${fieldLabel} expression`.
    expect(screen.getByLabelText('Expression pour URL')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Afficher ou masquer le sélecteur de données pour URL',
      }),
    ).toBeInTheDocument();
    // The placeholder is machine syntax: quoted in ICU so it survives verbatim.
    expect(screen.getByLabelText('Expression pour URL')).toHaveAttribute(
      'placeholder',
      '{{ $json.field }}',
    );
  });

  it('translates the data-picker tooltip and its empty state', () => {
    renderWithIntl(
      <ExpressionField
        value=""
        onChange={() => {}}
        fieldLabel="Corps"
        context={{ $json: undefined, $node: {}, $env: {} }}
        hasData={false}
      />,
      { locale: 'fr-FR' },
    );

    // `title=` — another attribute the jsx-text-only lint gate cannot see.
    expect(
      screen.getByTitle('Insérer une référence depuis les données d’exécution'),
    ).toBeInTheDocument();
    // The no-data hint renders through `t.rich`, with the `{{ }}` span kept literal.
    expect(
      screen.getByText(/Référencez les données d’exécution, par ex\./),
    ).toBeInTheDocument();
    expect(screen.getByText('{{ $json.field }}')).toBeInTheDocument();
  });

  it('keeps the resolved preview value untranslated while its copy is French', () => {
    renderWithIntl(
      <ExpressionField
        value="{{ $json.body.title }}"
        onChange={() => {}}
        fieldLabel="Sujet"
        context={context}
        hasData
      />,
      { locale: 'fr-FR' },
    );

    // Run data is the user's, never localised.
    expect(screen.getByText('Corriger le bug de connexion')).toBeInTheDocument();
    expect(screen.getByLabelText('Expression pour Sujet')).toBeInTheDocument();
  });
});
