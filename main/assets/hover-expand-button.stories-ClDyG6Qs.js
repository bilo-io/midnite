import{aX as t}from"./iframe-CSz9Xzq1.js";import{H as P,P as B}from"./hover-expand-button-308Xl_bC.js";import{O as f}from"./octagon-x-8v6CySqG.js";import{W as E}from"./workflow-BYuM1RxE.js";import"./preload-helper-Dp1pzeXC.js";import"./index-WjdaYHEO.js";import"./index-CYKnloRQ.js";import"./Select-ef7c0426.esm-C7TzW6fw.js";import"./chevron-down-DwXV9H4X.js";import"./check-CK_hhVdG.js";var r,l,n,i,c,d,p,u,m,h,v,g,_,y;const{expect:x,within:S}=__STORYBOOK_MODULE_TEST__,M={title:"Components/HoverExpandButton",component:P,parameters:{layout:"centered",docs:{description:{component:`A control-bar action that shows only its icon and expands to reveal its label on
hover or keyboard focus. The label stays in the DOM (clipped) so the control keeps
an accessible name even while collapsed.`}}},args:{icon:t.jsx(E,{className:"h-3.5 w-3.5"}),label:"Graph",variant:"outline"}},a={},s={args:{icon:t.jsx(B,{className:"h-3.5 w-3.5"}),label:"Pause scheduling",variant:"ghost"}},o={args:{icon:t.jsx(f,{className:"h-3.5 w-3.5"}),label:"Emergency stop",variant:"ghost",className:"text-red-600 dark:text-red-400"}},e={args:{icon:t.jsx(B,{className:"h-3.5 w-3.5"}),label:"Pause scheduling",variant:"ghost"},play:async({canvasElement:w})=>{const b=S(w);x(b.getByRole("button",{name:"Pause scheduling"})).toBeTruthy(),x(b.getByText("Pause scheduling").getBoundingClientRect().width).toBe(0)}};a.parameters={...a.parameters,docs:{...(r=a.parameters)===null||r===void 0?void 0:r.docs,source:{originalSource:"{}",...(n=a.parameters)===null||n===void 0||(l=n.docs)===null||l===void 0?void 0:l.source}}};s.parameters={...s.parameters,docs:{...(i=s.parameters)===null||i===void 0?void 0:i.docs,source:{originalSource:`{
  args: {
    icon: <Pause className="h-3.5 w-3.5" />,
    label: 'Pause scheduling',
    variant: 'ghost'
  }
}`,...(d=s.parameters)===null||d===void 0||(c=d.docs)===null||c===void 0?void 0:c.source}}};o.parameters={...o.parameters,docs:{...(p=o.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  args: {
    icon: <OctagonX className="h-3.5 w-3.5" />,
    label: 'Emergency stop',
    variant: 'ghost',
    className: 'text-red-600 dark:text-red-400'
  }
}`,...(m=o.parameters)===null||m===void 0||(u=m.docs)===null||u===void 0?void 0:u.source}}};e.parameters={...e.parameters,docs:{...(h=e.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
  args: {
    icon: <Pause className="h-3.5 w-3.5" />,
    label: 'Pause scheduling',
    variant: 'ghost'
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // Reachable by its label as accessible name even while collapsed…
    expect(canvas.getByRole('button', {
      name: 'Pause scheduling'
    })).toBeTruthy();
    // …and the visible label is clipped to zero width until revealed.
    expect(canvas.getByText('Pause scheduling').getBoundingClientRect().width).toBe(0);
  }
}`,...(g=e.parameters)===null||g===void 0||(v=g.docs)===null||v===void 0?void 0:v.source},description:{story:`Collapsed by default: the control is icon-only, its label present in the DOM
(so it keeps an accessible name) but clipped to zero width. The label reveals on
hover / keyboard focus via CSS — a pointer-driven behavior best verified visually
(see the Playwright screenshots in the PR), not through synthetic events, which
don't engage \`:hover\`.`,...(y=e.parameters)===null||y===void 0||(_=y.docs)===null||_===void 0?void 0:_.description}}};const X=["Graph","Pause_","EmergencyStop","CollapsedByDefault"];export{e as CollapsedByDefault,o as EmergencyStop,a as Graph,s as Pause_,X as __namedExportsOrder,M as default};
