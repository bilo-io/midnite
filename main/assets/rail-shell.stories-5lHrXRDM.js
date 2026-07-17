import{g as p,n as t,e as l,r as R}from"./iframe-DLK6r6p_.js";import{B as O}from"./brain-BnlNounN.js";import"./preload-helper-Dp1pzeXC.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"m16 15-3-3 3-3",key:"14y99z"}]],S=p("panel-left-close",B);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"m14 9 3 3-3 3",key:"8010ee"}]],E=p("panel-left-open",D);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M15 3v18",key:"14nvp0"}],["path",{d:"m8 9 3 3-3 3",key:"12hl5m"}]],I=p("panel-right-close",C);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M15 3v18",key:"14nvp0"}],["path",{d:"m10 15-3-3 3-3",key:"1pgupc"}]],H=p("panel-right-open",L),A=288;function q({left:n,right:e,isMobile:a,children:o,centerActions:r,className:i}){const s=!!(n||e);return t.jsxs("div",{className:l("flex flex-col gap-5 lg:flex-row lg:items-start",i),children:[n?t.jsx(N,{side:"left",isMobile:a,...n}):null,t.jsxs("div",{className:"relative min-w-0 flex-1",children:[!a&&n?t.jsx(T,{side:"left",open:n.open,title:n.title,onToggle:n.onToggle}):null,!a&&e?t.jsx(T,{side:"right",open:e.open,title:e.title,onToggle:e.onToggle}):null,!a&&r?t.jsx("div",{className:l("absolute top-2 z-20 hidden items-center gap-1 lg:flex",e?"right-12":"right-2"),children:r}):null,t.jsx("div",{className:l(s&&"lg:pt-11"),children:o})]}),e?t.jsx(N,{side:"right",isMobile:a,...e}):null]})}function N({side:n,title:e,icon:a,open:o,width:r=A,content:i,isMobile:s}){const k=t.jsxs("div",{className:"mb-3 flex items-center gap-1.5",children:[a,t.jsx("h2",{className:"text-sm font-semibold",children:e})]});return s?o?t.jsxs("aside",{"aria-label":e,className:"w-full rounded-lg border border-border/60 bg-card/40 p-4",children:[k,i]}):null:t.jsx("aside",{"aria-label":e,"aria-hidden":!o,className:l("hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:block",n==="left"?"lg:order-first":"lg:order-last"),style:{width:o?r:0},children:t.jsxs("div",{className:l("rounded-lg border border-border/60 bg-card/40 p-4 transition-opacity duration-200 motion-reduce:transition-none",o?"opacity-100":"pointer-events-none opacity-0"),style:{width:r},children:[k,i]})})}function T({side:n,open:e,title:a,onToggle:o}){const r=n==="left"?e?S:E:e?I:H,i=`${e?"Collapse":"Expand"} ${a}`;return t.jsx("button",{type:"button",onClick:o,"aria-label":i,"aria-pressed":e,title:i,className:l("absolute top-2 z-20 hidden h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition-colors duration-200 hover:bg-accent hover:text-foreground motion-reduce:transition-none lg:flex",n==="left"?"left-2":"right-2"),children:t.jsx(r,{className:"h-4 w-4"})})}q.__docgenInfo={description:"",methods:[],displayName:"RailShell",props:{left:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  /** Rail heading, also the accessible name of the toggle. */
  title: string;
  /** Optional icon rendered before the heading. */
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Desktop open width in px (default 288 = w-72). */
  width?: number;
  content: ReactNode;
}`,signature:{properties:[{key:"title",value:{name:"string",required:!0},description:"Rail heading, also the accessible name of the toggle."},{key:"icon",value:{name:"ReactNode",required:!1},description:"Optional icon rendered before the heading."},{key:"open",value:{name:"boolean",required:!0}},{key:"onToggle",value:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}},required:!0}},{key:"width",value:{name:"number",required:!1},description:"Desktop open width in px (default 288 = w-72)."},{key:"content",value:{name:"ReactNode",required:!0}}]}},description:""},right:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  /** Rail heading, also the accessible name of the toggle. */
  title: string;
  /** Optional icon rendered before the heading. */
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Desktop open width in px (default 288 = w-72). */
  width?: number;
  content: ReactNode;
}`,signature:{properties:[{key:"title",value:{name:"string",required:!0},description:"Rail heading, also the accessible name of the toggle."},{key:"icon",value:{name:"ReactNode",required:!1},description:"Optional icon rendered before the heading."},{key:"open",value:{name:"boolean",required:!0}},{key:"onToggle",value:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}},required:!0}},{key:"width",value:{name:"number",required:!1},description:"Desktop open width in px (default 288 = w-72)."},{key:"content",value:{name:"ReactNode",required:!0}}]}},description:""},isMobile:{required:!0,tsType:{name:"boolean"},description:""},children:{required:!0,tsType:{name:"ReactNode"},description:"The center content."},centerActions:{required:!1,tsType:{name:"ReactNode"},description:`Extra content-layer controls floated in the center's top-right corner, just
left of the right rail toggle (desktop only — pair with a header control for
mobile, where the floating toggles live in the page header).`},className:{required:!1,tsType:{name:"string"},description:""}}};T.__docgenInfo={description:`The floating, content-layer toggle pinned to a top corner of the center.
Exported so bespoke rail layouts (media, councils) can reuse the exact style
without adopting the full <RailShell>.`,methods:[],displayName:"RailFloatingToggle",props:{side:{required:!0,tsType:{name:"union",raw:"'left' | 'right'",elements:[{name:"literal",value:"'left'"},{name:"literal",value:"'right'"}]},description:""},open:{required:!0,tsType:{name:"boolean"},description:""},title:{required:!0,tsType:{name:"string"},description:""},onToggle:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};var g,h,m,f,v,y,b,x,w,_;const{expect:u,userEvent:j,within:$}=__STORYBOOK_MODULE_TEST__;function P({startLeft:n=!0,startRight:e=!0}){const[a,o]=R.useState(n),[r,i]=R.useState(e);return t.jsx(q,{isMobile:!1,left:{title:"Sources",icon:t.jsx(O,{className:"h-4 w-4"}),open:a,onToggle:()=>o(s=>!s),content:t.jsx("p",{className:"text-sm text-muted-foreground",children:"Left rail body"})},right:{title:"Studio",open:r,onToggle:()=>i(s=>!s),content:t.jsx("p",{className:"text-sm text-muted-foreground",children:"Right rail body"})},children:t.jsx("div",{className:"rounded-lg border border-border/60 bg-card/40 p-4",children:"Center content"})})}const U={title:"Components/RailShell",component:P,decorators:[n=>t.jsx("div",{className:"w-[900px]",children:t.jsx(n,{})})]},d={},c={play:async({canvasElement:n})=>{const e=$(n),a=e.getByRole("button",{name:"Collapse Sources"});await u(a).toHaveAttribute("aria-pressed","true"),await u(e.getByText("Left rail body")).toBeInTheDocument(),await j.click(a),await u(e.getByRole("button",{name:"Expand Sources"})).toHaveAttribute("aria-pressed","false"),await j.click(e.getByRole("button",{name:"Collapse Studio"})),await u(e.getByRole("button",{name:"Expand Studio"})).toBeInTheDocument()}};d.parameters={...d.parameters,docs:{...(g=d.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:"{}",...(m=d.parameters)===null||m===void 0||(h=m.docs)===null||h===void 0?void 0:h.source},description:{story:"Both rails open, no interaction — a stable baseline (used for screenshots).",...(v=d.parameters)===null||v===void 0||(f=v.docs)===null||f===void 0?void 0:f.description}}};c.parameters={...c.parameters,docs:{...(y=c.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // The toggle is a content-layer control naming the rail — reflecting open state.
    const leftToggle = canvas.getByRole('button', {
      name: 'Collapse Sources'
    });
    await expect(leftToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByText('Left rail body')).toBeInTheDocument();

    // Collapsing flips the control's label + pressed state (the rail animates to 0).
    await userEvent.click(leftToggle);
    await expect(canvas.getByRole('button', {
      name: 'Expand Sources'
    })).toHaveAttribute('aria-pressed', 'false');

    // The right rail toggles independently.
    await userEvent.click(canvas.getByRole('button', {
      name: 'Collapse Studio'
    }));
    await expect(canvas.getByRole('button', {
      name: 'Expand Studio'
    })).toBeInTheDocument();
  }
}`,...(x=c.parameters)===null||x===void 0||(b=x.docs)===null||b===void 0?void 0:b.source},description:{story:"Both rails open; the toggles live in the content layer, not the rails.",...(_=c.parameters)===null||_===void 0||(w=_.docs)===null||w===void 0?void 0:w.description}}};const K=["Open","Default"];export{c as Default,d as Open,K as __namedExportsOrder,U as default};
