import{i as T}from"./mock-fetch-aFrr3kfG.js";import{r as l,l as e,d as j}from"./iframe-Cg2o_Bk-.js";import{z as k}from"./site-links-BhZk_F72.js";import{l as L,t as M}from"./index-Bw-__ywM.js";import{t as N,ak as F}from"./api-CJSY_K2f.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CbYVl3vK.js";import"./Select-ef7c0426.esm-BlqT6X20.js";import"./chevron-down-3i-4yyLW.js";import"./check-CKIAQW2Y.js";const C="midnite.lastLoginMethod",U=[...k,"email"];function A(){try{const t=window.localStorage.getItem(C);return U.includes(t)?t:null}catch{return null}}function R(t){try{window.localStorage.setItem(C,t)}catch{}}const z={google:"Continue with Google",github:"Continue with GitHub"},V={google:void 0,github:"gradient-border--mono"};function G({redirect:t="/"}){const[o,P]=l.useState(null),[E,O]=l.useState(null);l.useEffect(()=>{O(A());let n=!0;return N().then(H=>{n&&P(H)}),()=>{n=!1}},[]);const D=o&&o.length>0?o:k;return e.jsxs("div",{className:"flex flex-col gap-3",children:[e.jsx("div",{className:"flex flex-col gap-2",children:D.map(n=>e.jsx(L,{trigger:"hover",className:j("rounded-lg",V[n],E===n&&"gradient-border--always"),children:e.jsxs("a",{href:F(n,t),onClick:()=>R(n),className:j(M({variant:"ghost"}),"relative h-11 w-full gap-2.5 rounded-lg bg-background hover:bg-muted/60 hover:text-foreground"),"data-testid":`sso-${n}`,children:[e.jsx(W,{provider:n}),z[n],E===n&&e.jsx(I,{})]})},n))}),e.jsxs("div",{className:"flex items-center gap-3","aria-hidden":"true",children:[e.jsx("span",{className:"h-px flex-1 bg-border"}),e.jsx("span",{className:"text-xs uppercase tracking-wide text-muted-foreground",children:"or"}),e.jsx("span",{className:"h-px flex-1 bg-border"})]})]})}function I(){return e.jsx("span",{className:"pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-medium uppercase tracking-wider text-muted-foreground",children:"last"})}function W({provider:t}){return t==="google"?e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 48 48","aria-hidden":"true",className:"shrink-0",children:[e.jsx("path",{fill:"#4285F4",d:"M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"}),e.jsx("path",{fill:"#34A853",d:"M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"}),e.jsx("path",{fill:"#FBBC05",d:"M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"}),e.jsx("path",{fill:"#EA4335",d:"M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"})]}):e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"currentColor","aria-hidden":"true",className:"shrink-0",children:e.jsx("path",{d:"M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.63 7.63 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"})})}G.__docgenInfo={description:`Phase 70 D — "Continue with Google / GitHub" buttons for the login + register
pages. Full-page nav to the gateway's SSO start (like \`getOAuthStartUrl\`).

The buttons are **always shown** so SSO is a visible, first-class login method.
When the gateway reports a configured provider set (\`GET /auth/sso/providers\`),
we narrow to exactly those; while loading, or when the gateway reports none
(SSO not yet configured / JWT off), we fall back to both — a click on an
unconfigured provider gets a friendly \`sso_error\` from the gateway rather than a
missing button. \`redirect\` is the same-origin path to return to after login.

Hovering a button lights the app's gradient glow in the provider's palette
(Google rainbow, GitHub grayscale). The method last used to sign in (stored in
localStorage, incl. 'email' — see \`last-login-method.ts\`) keeps its button's
glow lit on arrival with a small "Last used" tag.`,methods:[],displayName:"SsoButtons",props:{redirect:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'/'",computed:!1}}}};I.__docgenInfo={description:`Tiny right-aligned "last" tag inside a highlighted login button. Absolutely
 positioned so it never shifts the button's centred label + logo.`,methods:[],displayName:"LastUsedTag"};var c,d,u,h,g,p,m,v,f,w,b,x,y,_,B;const{expect:a,within:S}=__STORYBOOK_MODULE_TEST__,oe={title:"Auth/SsoButtons",component:G,parameters:{layout:"centered"}},s={args:{redirect:"/board"},beforeEach:()=>T([{match:"/auth/sso/providers",json:{providers:["google","github"]}}]),play:async({canvasElement:t})=>{const o=S(t);await a(await o.findByText("Continue with Google")).toBeInTheDocument(),await a(o.getByText("Continue with GitHub")).toBeInTheDocument(),await a(o.getByTestId("sso-google")).toHaveAttribute("href",a.stringContaining("/auth/sso/google/start"))}},r={beforeEach:()=>T([{match:"/auth/sso/providers",json:{providers:["github"]}}]),play:async({canvasElement:t})=>{const o=S(t);await a(await o.findByText("Continue with GitHub")).toBeInTheDocument(),await a(o.getByText("Continue with Google")).toBeInTheDocument()}},i={beforeEach:()=>T([{match:"/auth/sso/providers",json:{providers:[]}}]),play:async({canvasElement:t})=>{const o=S(t);await a(await o.findByText("Continue with Google")).toBeInTheDocument(),await a(o.getByText("Continue with GitHub")).toBeInTheDocument()}};s.parameters={...s.parameters,docs:{...(c=s.parameters)===null||c===void 0?void 0:c.docs,source:{originalSource:`{
  args: {
    redirect: '/board'
  },
  beforeEach: () => installMockFetch([{
    match: '/auth/sso/providers',
    json: {
      providers: ['google', 'github']
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Continue with Google')).toBeInTheDocument();
    await expect(canvas.getByText('Continue with GitHub')).toBeInTheDocument();
    await expect(canvas.getByTestId('sso-google')).toHaveAttribute('href', expect.stringContaining('/auth/sso/google/start'));
  }
}`,...(u=s.parameters)===null||u===void 0||(d=u.docs)===null||d===void 0?void 0:d.source},description:{story:"Both providers configured — the login/register button row.",...(g=s.parameters)===null||g===void 0||(h=g.docs)===null||h===void 0?void 0:h.description}}};r.parameters={...r.parameters,docs:{...(p=r.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/auth/sso/providers',
    json: {
      providers: ['github']
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Continue with GitHub')).toBeInTheDocument();
    await expect(canvas.getByText('Continue with Google')).toBeInTheDocument();
  }
}`,...(v=r.parameters)===null||v===void 0||(m=v.docs)===null||m===void 0?void 0:m.source},description:{story:`Only GitHub configured — both buttons still show (SSO stays fully visible by
 design; an unconfigured click gets a friendly error rather than a hidden button).`,...(w=r.parameters)===null||w===void 0||(f=w.docs)===null||f===void 0?void 0:f.description}}};i.parameters={...i.parameters,docs:{...(b=i.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/auth/sso/providers',
    json: {
      providers: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Continue with Google')).toBeInTheDocument();
    await expect(canvas.getByText('Continue with GitHub')).toBeInTheDocument();
  }
}`,...(y=i.parameters)===null||y===void 0||(x=y.docs)===null||x===void 0?void 0:x.source},description:{story:`Gateway reports no configured providers — the buttons still show (fallback to
 both) so SSO stays visible; an unconfigured click gets a friendly error.`,...(B=i.parameters)===null||B===void 0||(_=B.docs)===null||_===void 0?void 0:_.description}}};const ne=["BothProviders","SingleProvider","UnconfiguredFallback"];export{s as BothProviders,r as SingleProvider,i as UnconfiguredFallback,ne as __namedExportsOrder,oe as default};
