import{i as H}from"./mock-fetch-aFrr3kfG.js";import{y as W,b9 as r,b0 as L,bu as ee,aZ as e,aK as U}from"./iframe-CntJAXSQ.js";import{y as R,h as te,A as ne}from"./index-490MRAhq.js";import{aq as oe,ab as se,ao as ae,v as re,ap as ie}from"./api-D393iBDt.js";import{L as z}from"./loader-circle-CKWmlm8C.js";import{C as ce}from"./check-B3A__-pr.js";import{C as de}from"./copy-BQGJBfu4.js";import{E as le}from"./external-link-C1Sxediu.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CgS_9Nkn.js";import"./chevron-down-DWCX2rQA.js";const q="midnite.lastLoginMethod",ue=[...W,"email"];function he(){try{const t=window.localStorage.getItem(q);return ue.includes(t)?t:null}catch{return null}}function V(t){try{window.localStorage.setItem(q,t)}catch{}}const ge=r.createContext(null);function pe(){const t=r.useContext(ge);if(!t)throw new Error("useAuth must be used within AuthProvider");return t}function K({provider:t,onCancel:s}){const o=L("auth"),f=ee(),{applySession:g}=pe(),[a,i]=r.useState({kind:"starting"}),[x,u]=r.useState(!1),b=r.useRef(!1),l=r.useCallback(()=>{i({kind:"starting"}),u(!1),oe(t).then(c=>i({kind:"waiting",start:c})).catch(()=>i({kind:"failed",code:"provider_unavailable"}))},[t]);r.useEffect(()=>{b.current||(b.current=!0,l())},[l]),r.useEffect(()=>{if(a.kind!=="waiting")return;const{deviceAuthId:c,intervalSeconds:w,expiresInSeconds:J}=a.start,Z=Date.now()+J*1e3;let y=!1;const Q=setInterval(()=>{if(!y){if(Date.now()>Z){i({kind:"failed",code:"device_expired"});return}se(c).then(async h=>{if(y||h.status==="pending")return;if(h.status==="complete"){y=!0,await g(h.auth),V(t),f.push("/");return}const X=h.status==="denied"?"access_denied":h.status==="expired"?"device_expired":h.code;i({kind:"failed",code:X})}).catch(()=>{})}},w*1e3);return()=>{y=!0,clearInterval(Q)}},[a,g,t,f]);const _=()=>{a.kind==="waiting"&&navigator.clipboard.writeText(a.start.userCode).then(()=>{u(!0),setTimeout(()=>u(!1),2e3)}).catch(()=>{})};var n;return e.jsxs("div",{className:"flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-4",children:[a.kind==="starting"&&e.jsxs("div",{className:"flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground",children:[e.jsx(z,{className:"h-4 w-4 animate-spin","aria-hidden":"true"}),o("deviceStarting")]}),a.kind==="waiting"&&e.jsxs(e.Fragment,{children:[e.jsx("p",{className:"text-sm text-muted-foreground",children:o("deviceEnterCode")}),e.jsxs("div",{className:"flex items-center justify-center gap-2",children:[e.jsx("span",{className:"select-all rounded-md border border-border bg-background px-4 py-2 font-mono text-xl font-semibold tracking-[0.2em]","data-testid":"device-user-code",children:a.start.userCode}),e.jsx(R,{type:"button",variant:"ghost",size:"icon",onClick:_,"aria-label":o("deviceCopyCode"),children:x?e.jsx(ce,{className:"h-4 w-4"}):e.jsx(de,{className:"h-4 w-4"})})]}),e.jsxs("a",{href:a.start.verificationUri,target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center justify-center gap-1.5 text-sm font-medium text-foreground underline-offset-2 hover:underline",children:[o("deviceOpenProvider"),e.jsx(le,{className:"h-3.5 w-3.5","aria-hidden":"true"})]}),e.jsxs("div",{className:"flex items-center justify-center gap-2 text-xs text-muted-foreground",children:[e.jsx(z,{className:"h-3 w-3 animate-spin","aria-hidden":"true"}),o("deviceWaiting")]})]}),a.kind==="failed"&&e.jsxs("div",{className:"flex flex-col items-center gap-3 py-2",children:[e.jsx("p",{role:"alert",className:"text-center text-sm text-red-500",children:a.code==="device_expired"?o("deviceExpired"):(n=ae(a.code))!==null&&n!==void 0?n:o("deviceFailed")}),e.jsx(R,{type:"button",variant:"outline",size:"sm",onClick:l,children:o("deviceRetry")})]}),e.jsx("button",{type:"button",onClick:s,className:"text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",children:o("deviceBack")})]})}K.__docgenInfo={description:`Inline GitHub **device-flow** login (the secretless path a bare install uses —
no operator config, no client secret on the machine). Swapped into the login
card in place of the SSO buttons: shows the user code to enter at
github.com/login/device, polls the gateway until the grant lands, then applies
the returned session and heads home. \`onCancel\` restores the buttons.`,methods:[],displayName:"DeviceFlowPanel",props:{provider:{required:!0,tsType:{name:"LoginProvider"},description:""},onCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const me={google:"Google",github:"GitHub"},ve={google:void 0,github:"gradient-border--mono"};function Y({redirect:t="/"}){const s=L("auth"),[o,f]=r.useState(null),[g,a]=r.useState(null),[i,x]=r.useState(null);r.useEffect(()=>{a(he());let n=!0;return re().then(c=>{n&&f(c)}),()=>{n=!1}},[]);const u=o?[...o.providers,...o.deviceProviders]:[],b=u.length>0?u:W;var l;const _=new Set((l=o==null?void 0:o.deviceProviders)!==null&&l!==void 0?l:[]);return i?e.jsx("div",{className:"flex flex-col gap-3",children:e.jsx(K,{provider:i,onCancel:()=>x(null)})}):e.jsxs("div",{className:"flex flex-col gap-3",children:[e.jsx("div",{className:"flex flex-col gap-2",children:b.map(n=>{const c=e.jsxs(e.Fragment,{children:[e.jsx(fe,{provider:n}),s("continueWith",{provider:me[n]}),g===n&&e.jsx($,{})]}),w=U(te({variant:"ghost"}),"relative h-11 w-full gap-2.5 rounded-lg bg-background hover:bg-muted/60 hover:text-foreground");return e.jsx(ne,{trigger:"hover",className:U("rounded-lg",ve[n],g===n&&"gradient-border--always"),children:_.has(n)?e.jsx("button",{type:"button",onClick:()=>x(n),className:w,"data-testid":`sso-${n}`,children:c}):e.jsx("a",{href:ie(n,t),onClick:()=>V(n),className:w,"data-testid":`sso-${n}`,children:c})},n)})}),e.jsxs("div",{className:"flex items-center gap-3","aria-hidden":"true",children:[e.jsx("span",{className:"h-px flex-1 bg-border"}),e.jsx("span",{className:"text-xs uppercase tracking-wide text-muted-foreground",children:s("or")}),e.jsx("span",{className:"h-px flex-1 bg-border"})]})]})}function $(){const t=L("auth");return e.jsx("span",{className:"pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-medium uppercase tracking-wider text-muted-foreground",children:t("lastUsedShort")})}function fe({provider:t}){return t==="google"?e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 48 48","aria-hidden":"true",className:"shrink-0",children:[e.jsx("path",{fill:"#4285F4",d:"M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"}),e.jsx("path",{fill:"#34A853",d:"M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"}),e.jsx("path",{fill:"#FBBC05",d:"M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"}),e.jsx("path",{fill:"#EA4335",d:"M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"})]}):e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"currentColor","aria-hidden":"true",className:"shrink-0",children:e.jsx("path",{d:"M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.63 7.63 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"})})}Y.__docgenInfo={description:`Phase 70 D — "Continue with Google / GitHub" buttons for the login + register
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
glow lit on arrival with a small "Last used" tag.`,methods:[],displayName:"SsoButtons",props:{redirect:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'/'",computed:!1}}}};$.__docgenInfo={description:`Tiny right-aligned "last" tag inside a highlighted login button. Absolutely
 positioned so it never shifts the button's centred label + logo.`,methods:[],displayName:"LastUsedTag"};var j,S,C,k,T,B,E,N,P,I,D,G,O,A,F;const{expect:d,within:M}=__STORYBOOK_MODULE_TEST__,Ee={title:"Auth/SsoButtons",component:Y,parameters:{layout:"centered"}},p={args:{redirect:"/board"},beforeEach:()=>H([{match:"/auth/sso/providers",json:{providers:["google","github"]}}]),play:async({canvasElement:t})=>{const s=M(t);await d(await s.findByText("Continue with Google")).toBeInTheDocument(),await d(s.getByText("Continue with GitHub")).toBeInTheDocument(),await d(s.getByTestId("sso-google")).toHaveAttribute("href",d.stringContaining("/auth/sso/google/start"))}},m={beforeEach:()=>H([{match:"/auth/sso/providers",json:{providers:["github"]}}]),play:async({canvasElement:t})=>{const s=M(t);await d(await s.findByText("Continue with GitHub")).toBeInTheDocument(),await d(s.getByText("Continue with Google")).toBeInTheDocument()}},v={beforeEach:()=>H([{match:"/auth/sso/providers",json:{providers:[]}}]),play:async({canvasElement:t})=>{const s=M(t);await d(await s.findByText("Continue with Google")).toBeInTheDocument(),await d(s.getByText("Continue with GitHub")).toBeInTheDocument()}};p.parameters={...p.parameters,docs:{...(j=p.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
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
}`,...(C=p.parameters)===null||C===void 0||(S=C.docs)===null||S===void 0?void 0:S.source},description:{story:"Both providers configured — the login/register button row.",...(T=p.parameters)===null||T===void 0||(k=T.docs)===null||k===void 0?void 0:k.description}}};m.parameters={...m.parameters,docs:{...(B=m.parameters)===null||B===void 0?void 0:B.docs,source:{originalSource:`{
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
}`,...(N=m.parameters)===null||N===void 0||(E=N.docs)===null||E===void 0?void 0:E.source},description:{story:`Only GitHub configured — both buttons still show (SSO stays fully visible by
 design; an unconfigured click gets a friendly error rather than a hidden button).`,...(I=m.parameters)===null||I===void 0||(P=I.docs)===null||P===void 0?void 0:P.description}}};v.parameters={...v.parameters,docs:{...(D=v.parameters)===null||D===void 0?void 0:D.docs,source:{originalSource:`{
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
}`,...(O=v.parameters)===null||O===void 0||(G=O.docs)===null||G===void 0?void 0:G.source},description:{story:`Gateway reports no configured providers — the buttons still show (fallback to
 both) so SSO stays visible; an unconfigured click gets a friendly error.`,...(F=v.parameters)===null||F===void 0||(A=F.docs)===null||A===void 0?void 0:A.description}}};const Ne=["BothProviders","SingleProvider","UnconfiguredFallback"];export{p as BothProviders,m as SingleProvider,v as UnconfiguredFallback,Ne as __namedExportsOrder,Ee as default};
