import{n as T}from"./iframe-CHRwHqqi.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-NSV5n0Lf.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-C0uYzgnz.js";import"./index-BChqFaaU.js";import"./check-Cg3Vvtmi.js";import"./project-tag-DuzW5cf-.js";import"./inbound-B2u08JBq.js";import"./project-modal-Naq05mI_.js";import"./export-menu-B7Z2J-Lv.js";import"./client-C4ZsJKQ2.js";import"./markdown-preview-DkOlzAk0.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Do17CwB6.js";import"./copy-CPf1KcOH.js";import"./file-code-corner-CDBJv2bL.js";import"./loader-circle-FKUCr74-.js";import"./api-BFzohKx1.js";import"./folder-open-CekgH0P_.js";import"./folder-DUgQDHBU.js";import"./tag-color-picker-BFo92uoz.js";import"./source-list-editor-Daq1LAWh.js";import"./confirm-dialog-X8qDJQsO.js";import"./triangle-alert-DFJOWFE1.js";import"./source-icon-1C1dafSt.js";import"./globe-BQ2aMcfG.js";import"./sticky-note-DOBY7oDe.js";import"./plus-2jbku57u.js";import"./external-link-BEbhSDn_.js";import"./task-row-BaKOCOxk.js";import"./blocked-badge-Z7zorwry.js";import"./selectable-icon-DPdpz8XL.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-C2RzIRvL.js";import"./pencil-DAuCl7j1.js";import"./trash-2-L4-XB1Wu.js";import"./refresh-cw-DoU8Sb4u.js";import"./index-DkWdQ34z.js";import"./lightbulb-KAzjBIEm.js";import"./templates-B6M1OYb3.js";import"./sparkles-D4N2inJQ.js";import"./brain-BGBaTlpL.js";import"./chevron-right-B3lau6HX.js";import"./spinner-D6yGCp13.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CwOpwG6y.js";import"./useQuery-ldNr4gdm.js";import"./presentation-BC3JENOk.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Dt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: [project, projectMinimal]
  }, {
    match: '/tasks',
    json: tasks
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', {
      name: 'Board Room'
    })).toBeInTheDocument();
    // The project list loads asynchronously (Promise.all of three endpoints).
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  }
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: []
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  }
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  }
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const kt=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,kt as __namedExportsOrder,Dt as default};
