import{b2 as N,bb as E,a$ as e,aM as F}from"./iframe-ErTqIs5U.js";import{l as b}from"./index-D-OJsRsV.js";import{h as _}from"./index-BJ3wPdfM.js";import{F as A,L as S}from"./features-7eP43Xgr.js";import{A as I}from"./arrow-left-CBiWyOUF.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CkdW5jqN.js";import"./chevron-down-CFlz4HBc.js";import"./check-xaBTdq-C.js";import"./list-checks-C2-yzVLL.js";import"./presentation-DlBPCu9e.js";import"./workflow-VL8ClSb2.js";import"./brain-circuit-qV4dpaRJ.js";import"./bot-message-square-DiVs-cjz.js";function U(){const a=N("nav");return E.useMemo(()=>{const t=(n,o)=>a.has(n)?a(n):o;return{label:n=>t(`features.${n.key}`,n.label),description:n=>t(`featureDescriptions.${n.key}`,n.description)}},[a])}function T({feature:a,singular:t,className:n}){const o=N("common"),B=U(),s=A.find(D=>D.key===a),l=s==null?void 0:s.Icon,R=s?B.label(s):o("chrome.notFound.fallbackCollection");var d;const C=(d=s==null?void 0:s.href)!==null&&d!==void 0?d:"/",w=o("chrome.notFound.title",{noun:t});return e.jsxs("div",{className:F("mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center",n),children:[e.jsxs("div",{className:"relative mb-8 h-40 w-56",children:[e.jsx("div",{"aria-hidden":!0,className:"absolute inset-0 -z-10 rounded-full bg-primary/10 blur-2xl"}),e.jsxs("svg",{viewBox:"0 0 224 160",fill:"none",role:"img","aria-label":w,className:"h-full w-full text-muted-foreground",children:[e.jsx("ellipse",{cx:"112",cy:"80",rx:"90",ry:"60",className:"stroke-border",strokeWidth:"1.5",strokeDasharray:"4 7"}),e.jsx("circle",{cx:"22",cy:"54",r:"3",className:"fill-muted-foreground/40"}),e.jsx("circle",{cx:"204",cy:"106",r:"4",className:"fill-primary/50"}),e.jsx("circle",{cx:"196",cy:"38",r:"2.5",className:"fill-muted-foreground/30"}),e.jsx("circle",{cx:"30",cy:"112",r:"2.5",className:"fill-muted-foreground/25"}),e.jsxs("g",{transform:"rotate(-6 112 78)",children:[e.jsx("rect",{x:"70",y:"38",width:"84",height:"80",rx:"14",className:"fill-card stroke-border",strokeWidth:"1.5"}),e.jsx("rect",{x:"84",y:"96",width:"40",height:"7",rx:"3.5",className:"fill-muted-foreground/25"}),e.jsx("rect",{x:"84",y:"108",width:"24",height:"6",rx:"3",className:"fill-muted-foreground/15"})]}),e.jsx("circle",{cx:"150",cy:"108",r:"26",className:"fill-background stroke-primary",strokeWidth:"3"}),e.jsx("text",{x:"150",y:"114",textAnchor:"middle",fontSize:"16",fontWeight:"700",letterSpacing:"-0.5",fontFamily:"ui-monospace, monospace",className:"fill-primary",children:"404"}),e.jsx("line",{x1:"170",y1:"128",x2:"188",y2:"146",className:"stroke-primary",strokeWidth:"4.5",strokeLinecap:"round"})]}),l?e.jsx("div",{"aria-hidden":!0,className:"pointer-events-none absolute",style:{left:"48%",top:"41%",transform:"translate(-50%, -50%)"},children:e.jsx(l,{className:"h-9 w-9 text-muted-foreground/70",strokeWidth:1.5})}):null]}),e.jsx("span",{className:"mb-2 rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 font-mono text-xs tracking-widest text-muted-foreground",children:"404"}),e.jsx("h1",{className:"text-lg font-semibold tracking-tight text-foreground first-letter:uppercase",children:w}),e.jsx("p",{className:"mt-1.5 max-w-sm text-sm text-muted-foreground",children:o("chrome.notFound.body",{noun:t})}),e.jsxs("div",{className:"mt-6 flex flex-wrap items-center justify-center gap-2.5",children:[e.jsxs(b,{href:"/dashboard",className:_({variant:"default"}),children:[e.jsx(S,{className:"h-4 w-4"}),o("chrome.notFound.goDashboard")]}),e.jsxs(b,{href:C,className:_({variant:"outline"}),children:[l?e.jsx(l,{className:"h-4 w-4"}):e.jsx(I,{className:"h-4 w-4"}),o("chrome.notFound.viewCollection",{collection:R})]})]})]})}T.__docgenInfo={description:`The shared "resource not found" panel. Unlike a bare 404 it names the missing
record's type, shows an on-brand vector graphic (a magnifier scanning a card
that reads 404, with the collection's own icon on the card), and offers two
recovery routes: back to the dashboard, or to the collection listing.

Used by every deep-link detail container (\`/councils/view\`, \`/tasks/view\`, …)
when a bookmarked or stale id resolves to nothing.`,methods:[],displayName:"ResourceNotFound",props:{feature:{required:!0,tsType:{name:"FeatureKey"},description:`The collection the missing record belongs to. Drives the resource icon,
the collection name ("View {label}"), and the "View …" link target — all
sourced from the {@link FEATURES} registry so this stays the single source
of truth.`},singular:{required:!0,tsType:{name:"string"},description:'Singular noun for the record, e.g. `"council"` — used in the explainer.\nCallers pass it **already translated** (Phase 82 D): the heading is an ICU\nmessage with the noun as an argument, so no locale needs the old\n`charAt(0).toUpperCase()` surgery, which only ever worked for English.'},className:{required:!1,tsType:{name:"string"},description:""}}};var u,m,h,p,f,x,g,v,y,k;const{expect:r,within:j}=__STORYBOOK_MODULE_TEST__,Q={title:"Components/ResourceNotFound",component:T,decorators:[a=>e.jsx("div",{className:"max-w-xl",children:e.jsx(a,{})})]},i={args:{feature:"councils",singular:"council"},play:async({canvasElement:a})=>{const t=j(a);await r(t.getByRole("heading",{name:/council not found/i})).toBeInTheDocument(),await r(t.getByText("This council could not be found.",{exact:!1})).toBeInTheDocument(),await r(t.getByRole("link",{name:/Go to Dashboard/})).toHaveAttribute("href","/dashboard"),await r(t.getByRole("link",{name:/View Councils/})).toHaveAttribute("href","/councils")}},c={args:{feature:"tasks",singular:"task"},play:async({canvasElement:a})=>{const t=j(a);await r(t.getByRole("heading",{name:/task not found/i})).toBeInTheDocument(),await r(t.getByRole("link",{name:/View Tasks/})).toHaveAttribute("href","/tasks")}};i.parameters={...i.parameters,docs:{...(u=i.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
  args: {
    feature: 'councils',
    singular: 'council'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // Names the resource + still shows 404.
    // The noun is an ICU argument now (Phase 82 D) and CSS raises the first letter,
    // so the accessible name carries the caller's casing — visually unchanged.
    await expect(canvas.getByRole('heading', {
      name: /council not found/i
    })).toBeInTheDocument();
    await expect(canvas.getByText('This council could not be found.', {
      exact: false
    })).toBeInTheDocument();
    // Both recovery links point at the right routes.
    await expect(canvas.getByRole('link', {
      name: /Go to Dashboard/
    })).toHaveAttribute('href', '/dashboard');
    await expect(canvas.getByRole('link', {
      name: /View Councils/
    })).toHaveAttribute('href', '/councils');
  }
}`,...(h=i.parameters)===null||h===void 0||(m=h.docs)===null||m===void 0?void 0:m.source},description:{story:`The user's example: a missing council names the resource, shows 404, and
 offers both recovery routes.`,...(f=i.parameters)===null||f===void 0||(p=f.docs)===null||p===void 0?void 0:p.description}}};c.parameters={...c.parameters,docs:{...(x=c.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  args: {
    feature: 'tasks',
    singular: 'task'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', {
      name: /task not found/i
    })).toBeInTheDocument();
    await expect(canvas.getByRole('link', {
      name: /View Tasks/
    })).toHaveAttribute('href', '/tasks');
  }
}`,...(v=c.parameters)===null||v===void 0||(g=v.docs)===null||g===void 0?void 0:g.source},description:{story:`A different collection — the icon, collection name, and link all follow the
 FEATURES registry.`,...(k=c.parameters)===null||k===void 0||(y=k.docs)===null||y===void 0?void 0:y.description}}};const X=["Council","Task"];export{i as Council,c as Task,X as __namedExportsOrder,Q as default};
