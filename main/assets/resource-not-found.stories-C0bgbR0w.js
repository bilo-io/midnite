import{n as e,e as A}from"./iframe-DLK6r6p_.js";import{l as k}from"./index-BUHCn3cy.js";import{Y as w}from"./index-BTkLbjYt.js";import{F as E,L as C}from"./features-SDOOZ7Aj.js";import{A as D}from"./arrow-left-Mejt1A0O.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DifjHr3G.js";import"./Select-ef7c0426.esm-eNKT3OL1.js";import"./chevron-down-CTeTdGaH.js";import"./check-DNPejkj4.js";import"./folder-CHx6bYSe.js";import"./list-checks-Cs6E2cou.js";import"./presentation-1u9bXQwp.js";import"./workflow-167timVr.js";import"./brain-circuit-CxEkMVyu.js";import"./bot-message-square-B-RoaMaS.js";import"./newspaper-Cef1tZIP.js";function b({feature:o,singular:t,className:T}){const a=E.find(R=>R.key===o),i=a==null?void 0:a.Icon;var l;const N=(l=a==null?void 0:a.label)!==null&&l!==void 0?l:"items";var c;const j=(c=a==null?void 0:a.href)!==null&&c!==void 0?c:"/",B=`${t.charAt(0).toUpperCase()}${t.slice(1)} not found`;return e.jsxs("div",{className:A("mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center",T),children:[e.jsxs("div",{className:"relative mb-8 h-40 w-56",children:[e.jsx("div",{"aria-hidden":!0,className:"absolute inset-0 -z-10 rounded-full bg-primary/10 blur-2xl"}),e.jsxs("svg",{viewBox:"0 0 224 160",fill:"none",role:"img","aria-label":`${t} not found`,className:"h-full w-full text-muted-foreground",children:[e.jsx("ellipse",{cx:"112",cy:"80",rx:"90",ry:"60",className:"stroke-border",strokeWidth:"1.5",strokeDasharray:"4 7"}),e.jsx("circle",{cx:"22",cy:"54",r:"3",className:"fill-muted-foreground/40"}),e.jsx("circle",{cx:"204",cy:"106",r:"4",className:"fill-primary/50"}),e.jsx("circle",{cx:"196",cy:"38",r:"2.5",className:"fill-muted-foreground/30"}),e.jsx("circle",{cx:"30",cy:"112",r:"2.5",className:"fill-muted-foreground/25"}),e.jsxs("g",{transform:"rotate(-6 112 78)",children:[e.jsx("rect",{x:"70",y:"38",width:"84",height:"80",rx:"14",className:"fill-card stroke-border",strokeWidth:"1.5"}),e.jsx("rect",{x:"84",y:"96",width:"40",height:"7",rx:"3.5",className:"fill-muted-foreground/25"}),e.jsx("rect",{x:"84",y:"108",width:"24",height:"6",rx:"3",className:"fill-muted-foreground/15"})]}),e.jsx("circle",{cx:"150",cy:"108",r:"26",className:"fill-background stroke-primary",strokeWidth:"3"}),e.jsx("text",{x:"150",y:"114",textAnchor:"middle",fontSize:"16",fontWeight:"700",letterSpacing:"-0.5",fontFamily:"ui-monospace, monospace",className:"fill-primary",children:"404"}),e.jsx("line",{x1:"170",y1:"128",x2:"188",y2:"146",className:"stroke-primary",strokeWidth:"4.5",strokeLinecap:"round"})]}),i?e.jsx("div",{"aria-hidden":!0,className:"pointer-events-none absolute",style:{left:"48%",top:"41%",transform:"translate(-50%, -50%)"},children:e.jsx(i,{className:"h-9 w-9 text-muted-foreground/70",strokeWidth:1.5})}):null]}),e.jsx("span",{className:"mb-2 rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 font-mono text-xs tracking-widest text-muted-foreground",children:"404"}),e.jsx("h1",{className:"text-lg font-semibold tracking-tight text-foreground",children:B}),e.jsxs("p",{className:"mt-1.5 max-w-sm text-sm text-muted-foreground",children:["This ",t," could not be found. It may have been deleted, or the link may be incorrect."]}),e.jsxs("div",{className:"mt-6 flex flex-wrap items-center justify-center gap-2.5",children:[e.jsxs(k,{href:"/dashboard",className:w({variant:"default"}),children:[e.jsx(C,{className:"h-4 w-4"}),"Go to Dashboard"]}),e.jsxs(k,{href:j,className:w({variant:"outline"}),children:[i?e.jsx(i,{className:"h-4 w-4"}):e.jsx(D,{className:"h-4 w-4"}),"View ",N]})]})]})}b.__docgenInfo={description:`The shared "resource not found" panel. Unlike a bare 404 it names the missing
record's type, shows an on-brand vector graphic (a magnifier scanning a card
that reads 404, with the collection's own icon on the card), and offers two
recovery routes: back to the dashboard, or to the collection listing.

Used by every deep-link detail container (\`/councils/view\`, \`/tasks/view\`, …)
when a bookmarked or stale id resolves to nothing.`,methods:[],displayName:"ResourceNotFound",props:{feature:{required:!0,tsType:{name:"FeatureKey"},description:`The collection the missing record belongs to. Drives the resource icon,
the collection name ("View {label}"), and the "View …" link target — all
sourced from the {@link FEATURES} registry so this stays the single source
of truth.`},singular:{required:!0,tsType:{name:"string"},description:'Singular noun for the record, e.g. `"council"` — used in the explainer.'},className:{required:!1,tsType:{name:"string"},description:""}}};var d,m,u,h,p,f,x,v,g,y;const{expect:n,within:_}=__STORYBOOK_MODULE_TEST__,P={title:"Components/ResourceNotFound",component:b,decorators:[o=>e.jsx("div",{className:"max-w-xl",children:e.jsx(o,{})})]},s={args:{feature:"councils",singular:"council"},play:async({canvasElement:o})=>{const t=_(o);await n(t.getByRole("heading",{name:"Council not found"})).toBeInTheDocument(),await n(t.getByText("This council could not be found.",{exact:!1})).toBeInTheDocument(),await n(t.getByRole("link",{name:/Go to Dashboard/})).toHaveAttribute("href","/dashboard"),await n(t.getByRole("link",{name:/View Councils/})).toHaveAttribute("href","/councils")}},r={args:{feature:"tasks",singular:"task"},play:async({canvasElement:o})=>{const t=_(o);await n(t.getByRole("heading",{name:"Task not found"})).toBeInTheDocument(),await n(t.getByRole("link",{name:/View Tasks/})).toHaveAttribute("href","/tasks")}};s.parameters={...s.parameters,docs:{...(d=s.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    feature: 'councils',
    singular: 'council'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // Names the resource + still shows 404.
    await expect(canvas.getByRole('heading', {
      name: 'Council not found'
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
}`,...(u=s.parameters)===null||u===void 0||(m=u.docs)===null||m===void 0?void 0:m.source},description:{story:`The user's example: a missing council names the resource, shows 404, and
 offers both recovery routes.`,...(p=s.parameters)===null||p===void 0||(h=p.docs)===null||h===void 0?void 0:h.description}}};r.parameters={...r.parameters,docs:{...(f=r.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  args: {
    feature: 'tasks',
    singular: 'task'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', {
      name: 'Task not found'
    })).toBeInTheDocument();
    await expect(canvas.getByRole('link', {
      name: /View Tasks/
    })).toHaveAttribute('href', '/tasks');
  }
}`,...(v=r.parameters)===null||v===void 0||(x=v.docs)===null||x===void 0?void 0:x.source},description:{story:`A different collection — the icon, collection name, and link all follow the
 FEATURES registry.`,...(y=r.parameters)===null||y===void 0||(g=y.docs)===null||g===void 0?void 0:g.description}}};const Q=["Council","Task"];export{s as Council,r as Task,Q as __namedExportsOrder,P as default};
