import{a_ as T}from"./iframe-CgkUxXSp.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-9vdZqwpA.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CvRymjnP.js";import"./Select-ef7c0426.esm-Bj9LFYDk.js";import"./chevron-down-BmyIY-zi.js";import"./check-D8GZnS6Z.js";import"./project-tag-BAt6Dq-D.js";import"./project-modal-BdjQx-sw.js";import"./export-menu-DsLOlUys.js";import"./client-CNCAvq87.js";import"./markdown-preview-DxrHVRni.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CeEXfuB1.js";import"./copy-Dveas0cJ.js";import"./file-code-corner-CnUOMaas.js";import"./loader-circle-a_Yp-6Vx.js";import"./api-CuiKGkET.js";import"./folder-open-oxaJO69i.js";import"./folder-Dak70-zn.js";import"./tag-color-picker-DGZNiK_9.js";import"./index-Ddc5NNOG.js";import"./sparkles-Xmm42iG_.js";import"./brain-m_1-GsyA.js";import"./chevron-right-D_wzeZgp.js";import"./markdown-editor-DVDVrxOE.js";import"./pencil-Do1DtE36.js";import"./trash-2-C1omUTGI.js";import"./confirm-dialog-BqVtqO9Z.js";import"./templates-dCnf9par.js";import"./project-template-labels-zW-DjTf9.js";import"./plus-IU2n7M9b.js";import"./task-row-PEj58PU_.js";import"./blocked-badge-yTpqrWtr.js";import"./selectable-icon-B1IsBPpQ.js";import"./hover-expand-button-DkiNq0N3.js";import"./index-96-Q3YMH.js";import"./data-refresh-BMDDjfk7.js";import"./rotate-ccw-B3m3UYqp.js";import"./play-BFSjgJ1k.js";import"./square-terminal-CmtR-RqN.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Bwucgadg.js";import"./spinner-CmWpNHE_.js";import"./task-route-D70_7rUP.js";import"./use-api-data-O5A5_B0w.js";import"./useQuery-B8VwUArY.js";import"./presentation-DvyOfE_s.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Dt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [project, projectMinimal],
      total: 2
    }
  }, {
    match: '/tasks',
    json: {
      items: tasks,
      total: tasks.length
    }
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
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};n.parameters={...n.parameters,docs:{...(_=n.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const kt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,kt as __namedExportsOrder,Dt as default};
