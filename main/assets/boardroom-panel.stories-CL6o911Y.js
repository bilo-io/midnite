import{n as T}from"./iframe-CNz5KHij.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-DEI5FJAg.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-VwhzwvIV.js";import"./index-C5ghNh63.js";import"./check-CMw8VXVG.js";import"./project-tag-W12TBdYX.js";import"./inbound-B8us280C.js";import"./project-modal-CYMgdWYT.js";import"./export-menu-BVwNh1ml.js";import"./client-Br3di9Re.js";import"./markdown-preview-Dg5-UkQR.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Bfd1Ueji.js";import"./copy-B-o4ltN_.js";import"./file-code-corner-DRSAMa2n.js";import"./loader-circle-4-ZMQwAZ.js";import"./api-4WxRUCnO.js";import"./folder-open-NUIN3LTM.js";import"./folder-sFtgy4XR.js";import"./tag-color-picker-BNw2qHbY.js";import"./source-list-editor-Dns1Gs8o.js";import"./confirm-dialog-DW6tBEaz.js";import"./triangle-alert-DrSezbxE.js";import"./source-icon-6XfC2D7b.js";import"./globe-DOsZr90C.js";import"./sticky-note-BENAZJ7r.js";import"./plus-bh9bwRJx.js";import"./external-link-DCaNVTZD.js";import"./task-row-DvSnrUVY.js";import"./blocked-badge-higZ6yAO.js";import"./selectable-icon-0awCizS4.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-omCme6r9.js";import"./pencil-BEWBvq_a.js";import"./trash-2-Cc4QIG46.js";import"./refresh-cw-D9jroR6t.js";import"./index-BMMtNKka.js";import"./lightbulb-BTZI3Wi1.js";import"./templates-B6M1OYb3.js";import"./sparkles-C8Dy7e6o.js";import"./brain-Btj25chb.js";import"./chevron-right-DMvDn6MR.js";import"./spinner-B3qdNRui.js";import"./task-route-D70_7rUP.js";import"./data-refresh-Bg9JsI16.js";import"./useQuery-DeYjPlPh.js";import"./presentation-ZsqWnQR5.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Dt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
