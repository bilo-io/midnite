import{aX as n,ay as R}from"./iframe-CZIOcK-E.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CRICraNB.js";import{P as H}from"./project-modal-CE2iIBH8.js";import"./preload-helper-Dp1pzeXC.js";import"./index-u5iYJcov.js";import"./Select-ef7c0426.esm-DwAAHodu.js";import"./chevron-down-Bn3DVHuY.js";import"./check-B603_-5_.js";import"./index-fLlqtUR0.js";import"./triangle-alert-DLIYGbNm.js";import"./export-menu-BDQAAbAM.js";import"./client-DtkuwTas.js";import"./markdown-preview-DMDQXI-W.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Vi-Qqswt.js";import"./copy-DR305u27.js";import"./file-code-corner-CsY-XRRv.js";import"./loader-circle-DLmvzyIH.js";import"./api-CRizjhHp.js";import"./folder-open-tNN0Uhtc.js";import"./folder-BlzLyBtw.js";import"./tag-color-picker-Bqd9Ux3C.js";import"./project-tag-DsTmsJdJ.js";import"./sparkles-CHUgrZco.js";import"./brain-Cf-YN3TK.js";import"./chevron-right-BAN8tShw.js";import"./markdown-editor-B_ZGRU1s.js";import"./pencil-DTwlOyDG.js";import"./trash-2-CqQT_z4P.js";import"./templates-CcaIohfQ.js";import"./plus-BbdTBblM.js";import"./task-row-DRRsJgq_.js";import"./i18n-labels-BrZI42-6.js";import"./selectable-icon-D7GVWSbh.js";import"./hover-expand-button-ZLCbH688.js";import"./index-zsl3eOeJ.js";import"./data-refresh-BLL7oLQA.js";import"./rotate-ccw-C3w-cjqP.js";import"./play-H9uSF4GL.js";import"./square-terminal-8bh_IS5a.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
