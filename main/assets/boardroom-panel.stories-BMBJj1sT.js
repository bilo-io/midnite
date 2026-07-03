import{n as T}from"./iframe-D56zeehm.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-DGTSTfeM.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-CMcnt6So.js";import"./index-uldj7XQ-.js";import"./check-DrTJmGpT.js";import"./project-tag-XT8NYgUq.js";import"./inbound-DG44u6YS.js";import"./project-modal-DpzA1i5I.js";import"./export-menu-CtTKPm44.js";import"./client-g-qyXJeb.js";import"./markdown-preview-CGuJq_q_.js";import"./index.dom-D_wTd2ti.js";import"./file-text-B-MD8U7S.js";import"./copy-CyJM959c.js";import"./file-code-corner-Bw9qWUWa.js";import"./loader-circle-BIiUOGy3.js";import"./api-Cm_UA91W.js";import"./folder-open-BD7wa6Ve.js";import"./folder-B2S26Tku.js";import"./tag-color-picker-CUK0mg5H.js";import"./source-list-editor-ku2n0dVl.js";import"./core.esm-BrtpOJFx.js";import"./source-icon-C8ZtQMJF.js";import"./globe-Ul3oDyEG.js";import"./sticky-note-7bUvdLHT.js";import"./plus-DKqgbHXr.js";import"./external-link-DGS_OYMm.js";import"./task-row-B2kDHMet.js";import"./blocked-badge-C8Esupm1.js";import"./selectable-icon-CD30N84j.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-UaNwyjDO.js";import"./pencil-WO7xN4WF.js";import"./trash-2-CX2Zyz8u.js";import"./confirm-dialog-CRGtfqWP.js";import"./triangle-alert-CnoAWDu3.js";import"./refresh-cw-DtPORVOj.js";import"./index-Csmsyqqs.js";import"./lightbulb-CqGSGuuW.js";import"./templates-B6M1OYb3.js";import"./sparkles-BEfbpLyC.js";import"./brain-C7DOKbQH.js";import"./chevron-right-D0TnVbRT.js";import"./spinner-BO2Zjl05.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DQ-zBsk_.js";import"./useQuery-CNNUZY33.js";import"./presentation-5GKwVZ6-.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,kt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const It=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,It as __namedExportsOrder,kt as default};
