import{b1 as T}from"./iframe-C9h0ttrh.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DmH7s6x4.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BvhVIVWc.js";import"./Select-ef7c0426.esm-DqoSHntW.js";import"./chevron-down-BlzvwwV3.js";import"./check-CPgmd7PC.js";import"./project-tag-DLIU83r3.js";import"./project-modal-BhhW4IXk.js";import"./export-menu-j_Vw8WHa.js";import"./client-DYOHvVgk.js";import"./markdown-preview-xrrPjsmz.js";import"./index.dom-D_wTd2ti.js";import"./copy-GFnO8x83.js";import"./file-code-corner-jRrY6UC3.js";import"./file-text-BtGRH9Co.js";import"./loader-circle-qAJLYWB5.js";import"./api-BmZNK2cC.js";import"./folder-open-Djzl5T3M.js";import"./folder-NsgKr92t.js";import"./tag-color-picker-1GVEMV4d.js";import"./sparkles-C2HLgPXw.js";import"./brain-BVwnGqEX.js";import"./chevron-right-BWw49OP4.js";import"./markdown-editor-BUgkqv_F.js";import"./pencil-CyU925lo.js";import"./trash-2-BIsFNROr.js";import"./confirm-dialog-Dc0xN1nM.js";import"./templates-U7pzACKw.js";import"./project-template-labels-DHok6AFc.js";import"./plus-CAxyA9gm.js";import"./task-row-BTraCLlv.js";import"./blocked-badge-B7fkYj_o.js";import"./selectable-icon-Dap_pHUM.js";import"./hover-expand-button-DtTCFCaj.js";import"./index-Cym9Ylcn.js";import"./data-refresh-DqPAmBAh.js";import"./rotate-ccw-B1a1fgjx.js";import"./play-DUjNSWF5.js";import"./square-terminal-DnILHVpc.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Dtqyfl6Q.js";import"./spinner-BVt7iuAA.js";import"./task-route-D70_7rUP.js";import"./use-api-data-D04UCtBu.js";import"./useQuery-DBhUJx4Y.js";import"./presentation-TS36iWu0.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Dt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,Dt as __namedExportsOrder,xt as default};
