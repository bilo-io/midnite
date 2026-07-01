import{h as j,C as D,r as u,n as e,f as E}from"./iframe-DJr7qVNo.js";import{X as O}from"./index-Dl4JnYVx.js";import{S as N}from"./sun-D5C4sYZC.js";import{C as I}from"./clock-BEoskNiY.js";import{C as M}from"./check-Dt-62BLG.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-bZvbO2wZ.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z",key:"1pdavp"}],["path",{d:"M20.054 15.987H3.946",key:"14rxg9"}]],P=j("laptop",z);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],R=j("moon",H),K=[{value:"light",label:"Light",Icon:N},{value:"dark",label:"Dark",Icon:R},{value:"system",label:"System",Icon:P},{value:"time",label:"Time",Icon:I}];function B({expanded:o}){const{preference:a,resolved:m,setPreference:C}=D(),[r,s]=u.useState(!1),T=u.useRef(null);u.useEffect(()=>{if(!r)return;const t=i=>{var n;!((n=T.current)===null||n===void 0)&&n.contains(i.target)||s(!1)},d=i=>{i.key==="Escape"&&s(!1)};return document.addEventListener("pointerdown",t),document.addEventListener("keydown",d),()=>{document.removeEventListener("pointerdown",t),document.removeEventListener("keydown",d)}},[r]);const L=m==="dark"?R:N;return e.jsxs("div",{ref:T,className:"group relative",children:[o?e.jsxs("button",{type:"button","aria-label":"Toggle theme","aria-haspopup":"menu","aria-expanded":r,onClick:()=>s(t=>!t),className:"flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",children:[e.jsx(L,{className:"h-4 w-4 shrink-0"}),e.jsx("span",{className:"truncate text-sm",children:"Theme"})]}):e.jsx(O,{type:"button",variant:"ghost",size:"icon","aria-label":"Toggle theme","aria-haspopup":"menu","aria-expanded":r,onClick:()=>s(t=>!t),children:e.jsx(L,{className:"h-4 w-4"})}),!r&&!o?e.jsx("span",{role:"tooltip",className:"pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100",children:"Theme"}):null,r?e.jsx("div",{role:"menu",className:E("absolute z-50 min-w-[10rem] rounded-md border bg-card text-card-foreground p-1 shadow-md",o?"bottom-full left-0 mb-1":"bottom-0 left-full ml-2"),children:K.map(({value:t,label:d,Icon:i})=>{const n=a===t;return e.jsxs("button",{type:"button",role:"menuitemradio","aria-checked":n,onClick:()=>{C(t),s(!1)},className:E("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors","hover:bg-accent hover:text-accent-foreground",n&&"bg-accent text-accent-foreground"),children:[e.jsx(i,{className:"h-4 w-4"}),e.jsx("span",{children:d}),n?e.jsx(M,{className:"ml-auto h-4 w-4"}):null]},t)})}):null]})}B.__docgenInfo={description:"",methods:[],displayName:"ThemeToggle",props:{expanded:{required:!1,tsType:{name:"boolean"},description:""}}};var p,h,g,v,f,x,_,y,b,k;const{expect:q,userEvent:w,within:S}=__STORYBOOK_MODULE_TEST__,G={title:"Components/ThemeToggle",component:B,decorators:[o=>e.jsx("div",{className:"flex min-h-[16rem] items-end p-4",children:e.jsx(o,{})})]},c={},l={play:async({canvasElement:o})=>{const a=S(o);await w.click(a.getByRole("button",{name:"Toggle theme"}));const m=await a.findByRole("menu");await w.click(S(m).getByRole("menuitemradio",{name:"Light"})),await w.click(a.getByRole("button",{name:"Toggle theme"})),await q(a.getByRole("menuitemradio",{name:"Light"})).toBeChecked()}};c.parameters={...c.parameters,docs:{...(p=c.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:"{}",...(g=c.parameters)===null||g===void 0||(h=g.docs)===null||h===void 0?void 0:h.source},description:{story:'Backed by the real ThemeProvider from the global decorator — picking an option\nactually flips the `dark` class on the preview document, which is the point.\n(The toolbar "Theme" global re-seeds it on the next remount.)',...(f=c.parameters)===null||f===void 0||(v=f.docs)===null||v===void 0?void 0:v.description}}};l.parameters={...l.parameters,docs:{...(x=l.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', {
      name: 'Toggle theme'
    }));
    const menu = await canvas.findByRole('menu');
    await userEvent.click(within(menu).getByRole('menuitemradio', {
      name: 'Light'
    }));
    // Selecting closes the menu; reopen and confirm Light is now checked.
    await userEvent.click(canvas.getByRole('button', {
      name: 'Toggle theme'
    }));
    await expect(canvas.getByRole('menuitemradio', {
      name: 'Light'
    })).toBeChecked();
  }
}`,...(y=l.parameters)===null||y===void 0||(_=y.docs)===null||_===void 0?void 0:_.source},description:{story:'Opening the menu and picking "Light" makes it the active (checked) choice.',...(k=l.parameters)===null||k===void 0||(b=k.docs)===null||b===void 0?void 0:b.description}}};const J=["Default","SelectLight"];export{c as Default,l as SelectLight,J as __namedExportsOrder,G as default};
